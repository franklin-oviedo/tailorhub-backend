import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Order } from '../entities/order.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { CreditNote } from '../entities/credit-note.entity';
import { DebitNote } from '../entities/debit-note.entity';
import { OrderStatusEnum } from '../enums/order.enum';
import {
  DiscountTypeEnum,
  InvoiceStatusEnum,
  PaymentMethodEnum,
} from '../enums/invoice.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { PaginatedResult } from '../common/types/paginated-result.type';
import {
  InvoiceCalculationLineInput,
  InvoiceCalculationService,
} from './invoice-calculation.service';
import { InvoiceNumberService } from './invoice-number.service';
import { FiscalDocumentService } from './fiscal-document.service';
import { CreateInvoiceFromOrderDto } from './dto/create-invoice-from-order.dto';
import { UpdateInvoiceDraftDto } from './dto/update-invoice-draft.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { RegisterInvoicePaymentDto } from './dto/register-invoice-payment.dto';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { GenerateFiscalReportDto } from './dto/generate-fiscal-report.dto';
import { InvoiceDocumentDto } from './dto/invoice-document.dto';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly invoiceCalculationService: InvoiceCalculationService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly fiscalDocumentService: FiscalDocumentService,
  ) {}

  async createFromOrder(
    dto: CreateInvoiceFromOrderDto,
    actor: JwtPayload,
  ): Promise<InvoiceDocumentDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: dto.orderId },
      relations: {
        store: true,
        customer: true,
        items: { product: true },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    this.assertStoreAccess(order.store.id, actor);

    if (!order.customer) {
      throw new BadRequestException('Order has no customer associated.');
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      throw new BadRequestException('Cancelled orders cannot be invoiced.');
    }

    if (order.status === OrderStatusEnum.COMPLETED) {
      throw new ConflictException('Completed orders cannot generate new invoices.');
    }

    if (!order.items.length) {
      throw new BadRequestException('Order without items cannot be invoiced.');
    }

    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        order: { id: order.id },
        status: In([
          InvoiceStatusEnum.DRAFT,
          InvoiceStatusEnum.ISSUED,
          InvoiceStatusEnum.PARTIALLY_PAID,
          InvoiceStatusEnum.PAID,
          InvoiceStatusEnum.CREDITED,
        ]),
      },
      select: { id: true, status: true },
    });

    if (existingInvoice) {
      if (
        existingInvoice.status === InvoiceStatusEnum.PAID ||
        existingInvoice.status === InvoiceStatusEnum.CREDITED
      ) {
        throw new ConflictException('This order already has a settled invoice and cannot be invoiced again.');
      }

      return this.findOne(existingInvoice.id, actor);
    }

    const selectedItems = this.resolveOrderItemsToInvoice(order, dto);
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lines = selectedItems.map<InvoiceCalculationLineInput>((selected) => ({
        orderItemId: selected.orderItem.id,
        description: selected.description,
        quantity: selected.quantity,
        unitPrice: Number(selected.orderItem.unitPrice),
        discountType: selected.discountType,
        discountValue: selected.discountValue,
        isTaxable: selected.isTaxable,
        taxRate: selected.taxRate,
        snapshot: {
          orderItemId: selected.orderItem.id,
          productId: selected.orderItem.product?.id,
          productName: selected.orderItem.product?.name,
          productDescription: selected.orderItem.product?.description ?? null,
        },
      }));

      const calculated = this.invoiceCalculationService.calculateInvoice(
        lines,
        dto.discountType,
        dto.discountValue,
      );

      const invoice = manager.getRepository(Invoice).create({
        store: order.store,
        customer: order.customer,
        order,
        status: InvoiceStatusEnum.DRAFT,
        invoiceSequence: null,
        invoiceNumber: null,
        fiscalDocumentType: null,
        fiscalNumber: null,
        currency: (dto.currency ?? this.invoiceCalculationService.getDefaultCurrency()).toUpperCase(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        issuedAt: null,
        subtotal: calculated.subtotal,
        discountType: dto.discountType ?? null,
        discountValue: dto.discountValue ?? 0,
        discountAmount: calculated.discountAmount,
        taxableAmount: calculated.taxableAmount,
        exemptAmount: calculated.exemptAmount,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        amountPaid: 0,
        balance: calculated.total,
        notes: dto.notes ?? null,
        termsAndConditions: dto.termsAndConditions ?? null,
        cancelReason: null,
        cancelledAt: null,
        createdByUserId: actor.sub,
        customerSnapshot: {
          id: order.customer.id,
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        orderSnapshot: {
          id: order.id,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          notes: order.notes,
          createdAt: order.createdAt,
        },
      });

      invoice.items = calculated.lines.map((line) =>
        manager.getRepository(InvoiceItem).create({
          orderItem: line.orderItemId ? ({ id: line.orderItemId } as never) : null,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          discountAmount: line.discountAmount,
          taxableBase: line.taxableBase,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          isTaxable: line.isTaxable,
          snapshot: line.snapshot,
        }),
      );

      const saved = await manager.getRepository(Invoice).save(invoice);

      if (order.status === OrderStatusEnum.PENDING) {
        order.status = OrderStatusEnum.IN_PROGRESS;
        await manager.getRepository(Order).save(order);
      }

      return saved.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async findAll(actor: JwtPayload, query: ListInvoicesQueryDto): Promise<PaginatedResult<Invoice>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.store', 'store')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.order', 'order');

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('store.id = :storeId', { storeId: actor.storeId });
    }

    if (query.customerId) {
      qb.andWhere('customer.id = :customerId', { customerId: query.customerId });
    }

    if (query.orderId) {
      qb.andWhere('order.id = :orderId', { orderId: query.orderId });
    }

    if (query.invoiceNumber) {
      qb.andWhere('invoice.invoiceNumber ILIKE :invoiceNumber', {
        invoiceNumber: `%${query.invoiceNumber}%`,
      });
    }

    if (query.fiscalNumber) {
      qb.andWhere('invoice.fiscalNumber ILIKE :fiscalNumber', {
        fiscalNumber: `%${query.fiscalNumber}%`,
      });
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    if (query.fiscalDocumentType) {
      qb.andWhere('invoice.fiscalDocumentType = :fiscalDocumentType', {
        fiscalDocumentType: query.fiscalDocumentType,
      });
    }

    if (query.dateFrom) {
      qb.andWhere('invoice.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      qb.andWhere('invoice.createdAt <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    qb.orderBy('invoice.createdAt', 'DESC').skip(skip).take(limit);
    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string, actor: JwtPayload): Promise<InvoiceDocumentDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: {
        store: true,
        order: true,
        customer: true,
        items: { orderItem: true },
        payments: true,
        creditNotes: true,
        debitNotes: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    this.assertStoreAccess(invoice.store.id, actor);
    const wasReconciled = this.reconcileInvoiceFinancialState(invoice);
    if (wasReconciled) {
      await this.invoiceRepository.update(invoice.id, {
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status,
      });
    }

    return this.mapToDocumentDto(invoice);
  }

  async updateDraft(
    id: string,
    dto: UpdateInvoiceDraftDto,
    actor: JwtPayload,
  ): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: { store: true, items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      if (invoice.status !== InvoiceStatusEnum.DRAFT) {
        throw new ConflictException('Only draft invoices can be updated.');
      }

      const itemMap = new Map(invoice.items.map((item) => [item.id, item]));
      const dtoItemsById = new Map((dto.items ?? []).map((item) => [item.id, item]));

      for (const dtoItem of dto.items ?? []) {
        if (!itemMap.has(dtoItem.id)) {
          throw new BadRequestException(`Invoice item ${dtoItem.id} does not belong to this invoice.`);
        }
      }

      const lines = invoice.items.map<InvoiceCalculationLineInput>((item) => {
        const patch = dtoItemsById.get(item.id);
        const finalIsTaxable = patch?.isTaxable ?? item.isTaxable;

        return {
          id: item.id,
          orderItemId: item.orderItem ? item.orderItem.id : null,
          description: patch?.description ?? item.description,
          quantity: patch?.quantity ?? item.quantity,
          unitPrice: patch?.unitPrice ?? Number(item.unitPrice),
          discountType: patch?.discountType ?? item.discountType,
          discountValue: patch?.discountValue ?? Number(item.discountValue),
          isTaxable: finalIsTaxable,
          taxRate: finalIsTaxable ? patch?.taxRate ?? Number(item.taxRate) : 0,
          snapshot: item.snapshot,
        };
      });

      const invoiceDiscountType = dto.discountType ?? invoice.discountType;
      const invoiceDiscountValue = dto.discountValue ?? Number(invoice.discountValue);
      const calculated = this.invoiceCalculationService.calculateInvoice(
        lines,
        invoiceDiscountType,
        invoiceDiscountValue,
      );

      invoice.currency = dto.currency ? dto.currency.toUpperCase() : invoice.currency;
      invoice.dueAt = dto.dueAt ? new Date(dto.dueAt) : invoice.dueAt;
      invoice.notes = dto.notes ?? invoice.notes;
      invoice.termsAndConditions = dto.termsAndConditions ?? invoice.termsAndConditions;
      invoice.discountType = invoiceDiscountType ?? null;
      invoice.discountValue = invoiceDiscountValue;
      invoice.subtotal = calculated.subtotal;
      invoice.discountAmount = calculated.discountAmount;
      invoice.taxableAmount = calculated.taxableAmount;
      invoice.exemptAmount = calculated.exemptAmount;
      invoice.taxAmount = calculated.taxAmount;
      invoice.total = calculated.total;
      invoice.balance = this.normalizeAmount(invoice.total - invoice.amountPaid);

      for (const line of calculated.lines) {
        const item = itemMap.get(line.id as string);
        if (!item) {
          continue;
        }

        item.description = line.description;
        item.quantity = line.quantity;
        item.unitPrice = line.unitPrice;
        item.discountType = line.discountType;
        item.discountValue = line.discountValue;
        item.discountAmount = line.discountAmount;
        item.taxableBase = line.taxableBase;
        item.taxRate = line.taxRate;
        item.taxAmount = line.taxAmount;
        item.lineTotal = line.lineTotal;
        item.isTaxable = line.isTaxable;
      }

      await manager.getRepository(InvoiceItem).save(invoice.items);
      await manager.getRepository(Invoice).save(invoice);

      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async issue(id: string, dto: IssueInvoiceDto, actor: JwtPayload): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lockedInvoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedInvoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: {
          store: true,
          customer: true,
          items: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      if (invoice.status !== InvoiceStatusEnum.DRAFT) {
        throw new ConflictException('Invoice is already issued or not editable.');
      }

      if (!this.hasValidCustomerSnapshot(invoice.customerSnapshot)) {
        throw new BadRequestException('Invoice customer snapshot is incomplete.');
      }

      if (!invoice.items.length) {
        throw new BadRequestException('Invoice without items cannot be issued.');
      }

      const lines = invoice.items.map<InvoiceCalculationLineInput>((item) => ({
        id: item.id,
        orderItemId: item.orderItem ? item.orderItem.id : null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discountType: item.discountType,
        discountValue: Number(item.discountValue),
        isTaxable: item.isTaxable,
        taxRate: Number(item.taxRate),
        snapshot: item.snapshot,
      }));

      const calculated = this.invoiceCalculationService.calculateInvoice(
        lines,
        invoice.discountType,
        Number(invoice.discountValue),
      );

      const assignment = await this.fiscalDocumentService.assignFiscalDocument(manager, {
        invoiceId: invoice.id,
        fiscalDocumentType: dto.fiscalDocumentType,
        fiscalNumber: dto.fiscalNumber,
      });

      if (!invoice.invoiceNumber) {
        const next = await this.invoiceNumberService.getNextInvoiceNumber(manager);
        invoice.invoiceSequence = next.invoiceSequence;
        invoice.invoiceNumber = next.invoiceNumber;
      }

      invoice.fiscalDocumentType = assignment.fiscalDocumentType;
      invoice.fiscalNumber = assignment.fiscalNumber;
      invoice.issuedAt = new Date();
      invoice.dueAt = dto.dueAt ? new Date(dto.dueAt) : invoice.dueAt;
      invoice.subtotal = calculated.subtotal;
      invoice.discountAmount = calculated.discountAmount;
      invoice.taxableAmount = calculated.taxableAmount;
      invoice.exemptAmount = calculated.exemptAmount;
      invoice.taxAmount = calculated.taxAmount;
      invoice.total = calculated.total;
      invoice.balance = this.normalizeAmount(invoice.total - invoice.amountPaid);

      if (invoice.balance <= 0) {
        invoice.balance = 0;
        invoice.status = InvoiceStatusEnum.PAID;
      } else if (invoice.amountPaid > 0) {
        invoice.status = InvoiceStatusEnum.PARTIALLY_PAID;
      } else {
        invoice.status = InvoiceStatusEnum.ISSUED;
      }

      for (const line of calculated.lines) {
        const item = invoice.items.find((existing) => existing.id === line.id);
        if (!item) {
          continue;
        }

        item.discountAmount = line.discountAmount;
        item.taxableBase = line.taxableBase;
        item.taxAmount = line.taxAmount;
        item.lineTotal = line.lineTotal;
      }

      await manager.getRepository(InvoiceItem).save(invoice.items);
      await manager.getRepository(Invoice).save(invoice);
      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async registerPayment(
    id: string,
    dto: RegisterInvoicePaymentDto,
    actor: JwtPayload,
  ): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lockedInvoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedInvoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: { store: true, order: true, payments: true, creditNotes: true, debitNotes: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      const wasReconciled = this.reconcileInvoiceFinancialState(invoice);
      if (wasReconciled) {
        await manager.getRepository(Invoice).update(invoice.id, {
          amountPaid: invoice.amountPaid,
          balance: invoice.balance,
          status: invoice.status,
        });
      }

      if (
        invoice.status === InvoiceStatusEnum.DRAFT ||
        invoice.status === InvoiceStatusEnum.CANCELLED ||
        invoice.status === InvoiceStatusEnum.CREDITED
      ) {
        throw new BadRequestException('Current invoice status does not allow registering payments.');
      }

      const paymentAmount = this.normalizeAmount(dto.amount);
      if (paymentAmount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0.');
      }

      if (paymentAmount > this.normalizeAmount(invoice.balance)) {
        throw new BadRequestException('Payment amount cannot exceed invoice balance.');
      }

      const payment = manager.getRepository(InvoicePayment).create({
        invoice,
        amount: paymentAmount,
        paymentMethod: dto.paymentMethod ?? PaymentMethodEnum.OTHER,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        createdByUserId: actor.sub,
      });

      await manager.getRepository(InvoicePayment).save(payment);

      invoice.amountPaid = this.normalizeAmount(invoice.amountPaid + paymentAmount);
      invoice.balance = this.normalizeAmount(invoice.total - invoice.amountPaid);

      if (invoice.balance <= 0) {
        invoice.balance = 0;
        invoice.status = InvoiceStatusEnum.PAID;
      } else {
        invoice.status = InvoiceStatusEnum.PARTIALLY_PAID;
      }

      await manager.getRepository(Invoice).update(invoice.id, {
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        status: invoice.status,
      });

      if (invoice.status === InvoiceStatusEnum.PAID && invoice.order) {
        if (invoice.order.status !== OrderStatusEnum.COMPLETED) {
          invoice.order.status = OrderStatusEnum.COMPLETED;
          await manager.getRepository(Order).save(invoice.order);
        }
      } else if (invoice.order && invoice.order.status === OrderStatusEnum.PENDING) {
        invoice.order.status = OrderStatusEnum.IN_PROGRESS;
        await manager.getRepository(Order).save(invoice.order);
      }

      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async createCreditNote(
    id: string,
    dto: CreateCreditNoteDto,
    actor: JwtPayload,
  ): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lockedInvoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedInvoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: { store: true, creditNotes: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      if (
        invoice.status !== InvoiceStatusEnum.ISSUED &&
        invoice.status !== InvoiceStatusEnum.PARTIALLY_PAID &&
        invoice.status !== InvoiceStatusEnum.PAID
      ) {
        throw new BadRequestException('Current invoice status does not allow credit notes.');
      }

      const amount = this.normalizeAmount(dto.amount);
      const alreadyCredited = this.normalizeAmount(
        invoice.creditNotes.reduce((acc, note) => acc + this.normalizeAmount(note.amount), 0),
      );
      const maxCreditAvailable = this.normalizeAmount(invoice.total - alreadyCredited);

      if (amount > maxCreditAvailable) {
        throw new BadRequestException('Credit note amount exceeds available amount to credit.');
      }

      const creditNote = manager.getRepository(CreditNote).create({
        invoice,
        reason: dto.reason,
        amount,
        fiscalNumber: dto.fiscalNumber ?? null,
        affectedItems: dto.affectedItems ?? null,
        createdByUserId: actor.sub,
      });

      await manager.getRepository(CreditNote).save(creditNote);

      const updatedCredited = this.normalizeAmount(alreadyCredited + amount);
      if (updatedCredited >= this.normalizeAmount(invoice.total)) {
        invoice.status = InvoiceStatusEnum.CREDITED;
      }

      const newBalance = this.normalizeAmount(invoice.balance - amount);
      invoice.balance = newBalance <= 0 ? 0 : newBalance;

      await manager.getRepository(Invoice).update(invoice.id, {
        status: invoice.status,
        balance: invoice.balance,
      });

      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async createDebitNote(
    id: string,
    dto: CreateDebitNoteDto,
    actor: JwtPayload,
  ): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lockedInvoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedInvoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: { store: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      if (
        invoice.status !== InvoiceStatusEnum.ISSUED &&
        invoice.status !== InvoiceStatusEnum.PARTIALLY_PAID &&
        invoice.status !== InvoiceStatusEnum.PAID
      ) {
        throw new BadRequestException('Current invoice status does not allow debit notes.');
      }

      const amount = this.normalizeAmount(dto.amount);
      const debitNote = manager.getRepository(DebitNote).create({
        invoice,
        reason: dto.reason,
        amount,
        fiscalNumber: dto.fiscalNumber ?? null,
        createdByUserId: actor.sub,
      });

      await manager.getRepository(DebitNote).save(debitNote);

      invoice.balance = this.normalizeAmount(invoice.balance + amount);
      invoice.status = invoice.amountPaid > 0 ? InvoiceStatusEnum.PARTIALLY_PAID : InvoiceStatusEnum.ISSUED;

      await manager.getRepository(Invoice).save(invoice);
      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async cancel(id: string, dto: CancelInvoiceDto, actor: JwtPayload): Promise<InvoiceDocumentDto> {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const lockedInvoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedInvoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const invoice = await manager.getRepository(Invoice).findOne({
        where: { id },
        relations: { store: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      this.assertStoreAccess(invoice.store.id, actor);

      if (invoice.status === InvoiceStatusEnum.CANCELLED) {
        return invoice.id;
      }

      if (invoice.status === InvoiceStatusEnum.PAID || invoice.status === InvoiceStatusEnum.CREDITED) {
        throw new BadRequestException('Paid or credited invoices cannot be cancelled directly.');
      }

      if (this.normalizeAmount(invoice.amountPaid) > 0) {
        throw new BadRequestException('Invoices with payments cannot be cancelled directly.');
      }

      invoice.status = InvoiceStatusEnum.CANCELLED;
      invoice.cancelReason = dto.reason;
      invoice.cancelledAt = new Date();
      await manager.getRepository(Invoice).save(invoice);

      return invoice.id;
    });

    return this.findOne(invoiceId, actor);
  }

  async generateFiscalReport(actor: JwtPayload, dto: GenerateFiscalReportDto) {
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.store', 'store')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .where('invoice.issuedAt IS NOT NULL')
      .andWhere('invoice.issuedAt >= :dateFrom', { dateFrom: new Date(dto.dateFrom) })
      .andWhere('invoice.issuedAt <= :dateTo', { dateTo: new Date(dto.dateTo) });

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('store.id = :storeId', { storeId: actor.storeId });
    }

    if (dto.fiscalDocumentType) {
      qb.andWhere('invoice.fiscalDocumentType = :fiscalDocumentType', {
        fiscalDocumentType: dto.fiscalDocumentType,
      });
    }

    if (dto.status) {
      qb.andWhere('invoice.status = :status', { status: dto.status });
    }

    const invoices = await qb.getMany();

    return {
      reportRange: {
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
      },
      totalInvoices: invoices.length,
      totals: {
        subtotal: invoices.reduce((acc, invoice) => acc + this.normalizeAmount(invoice.subtotal), 0),
        discountAmount: invoices.reduce(
          (acc, invoice) => acc + this.normalizeAmount(invoice.discountAmount),
          0,
        ),
        taxAmount: invoices.reduce((acc, invoice) => acc + this.normalizeAmount(invoice.taxAmount), 0),
        total: invoices.reduce((acc, invoice) => acc + this.normalizeAmount(invoice.total), 0),
      },
      data: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        fiscalNumber: invoice.fiscalNumber,
        fiscalDocumentType: invoice.fiscalDocumentType,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        customerName: (invoice.customerSnapshot?.name as string | undefined) ?? null,
        total: this.normalizeAmount(invoice.total),
      })),
    };
  }

  private resolveOrderItemsToInvoice(order: Order, dto: CreateInvoiceFromOrderDto) {
    if (!dto.items?.length) {
      return order.items.map((orderItem) => ({
        orderItem,
        quantity: orderItem.quantity,
        discountType: null as DiscountTypeEnum | null,
        discountValue: 0,
        taxRate: this.invoiceCalculationService.getDefaultTaxRate(),
        isTaxable: true,
        description: orderItem.product?.name ?? 'Order item',
      }));
    }

    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));

    return dto.items.map((itemDto) => {
      const orderItem = orderItemsById.get(itemDto.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `Order item ${itemDto.orderItemId} does not belong to order ${order.id}.`,
        );
      }

      const quantity = itemDto.quantity ?? orderItem.quantity;
      if (quantity > orderItem.quantity) {
        throw new BadRequestException('Cannot invoice quantity greater than ordered quantity.');
      }

      return {
        orderItem,
        quantity,
        discountType: itemDto.discountType ?? null,
        discountValue: itemDto.discountValue ?? 0,
        taxRate: itemDto.taxRate ?? this.invoiceCalculationService.getDefaultTaxRate(),
        isTaxable: itemDto.isTaxable ?? true,
        description: orderItem.product?.name ?? 'Order item',
      };
    });
  }

  private mapToDocumentDto(invoice: Invoice): InvoiceDocumentDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      fiscalNumber: invoice.fiscalNumber,
      fiscalDocumentType: invoice.fiscalDocumentType,
      status: invoice.status,
      company: {
        id: invoice.store.id,
        name: invoice.store.name,
        email: invoice.store.email,
        phone: invoice.store.phone,
        address: invoice.store.address,
      },
      currency: invoice.currency,
      subtotal: this.normalizeAmount(invoice.subtotal),
      discountAmount: this.normalizeAmount(invoice.discountAmount),
      taxableAmount: this.normalizeAmount(invoice.taxableAmount),
      exemptAmount: this.normalizeAmount(invoice.exemptAmount),
      taxAmount: this.normalizeAmount(invoice.taxAmount),
      total: this.normalizeAmount(invoice.total),
      amountPaid: this.normalizeAmount(invoice.amountPaid),
      balance: this.normalizeAmount(invoice.balance),
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      customerSnapshot: invoice.customerSnapshot,
      orderSnapshot: invoice.orderSnapshot,
      items: (invoice.items ?? []).map((item) => ({
        id: item.id,
        orderItemId: item.orderItem ? item.orderItem.id : null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: this.normalizeAmount(item.unitPrice),
        discountType: item.discountType,
        discountValue: this.normalizeAmount(item.discountValue),
        discountAmount: this.normalizeAmount(item.discountAmount),
        taxableBase: this.normalizeAmount(item.taxableBase),
        taxRate: this.normalizeAmount(item.taxRate),
        taxAmount: this.normalizeAmount(item.taxAmount),
        lineTotal: this.normalizeAmount(item.lineTotal),
      })),
      payments: (invoice.payments ?? []).map((payment) => ({
        id: payment.id,
        amount: this.normalizeAmount(payment.amount),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        paidAt: payment.paidAt,
      })),
      creditNotes: (invoice.creditNotes ?? []).map((creditNote) => ({
        id: creditNote.id,
        reason: creditNote.reason,
        amount: this.normalizeAmount(creditNote.amount),
        fiscalNumber: creditNote.fiscalNumber,
        createdAt: creditNote.createdAt,
      })),
      debitNotes: (invoice.debitNotes ?? []).map((debitNote) => ({
        id: debitNote.id,
        reason: debitNote.reason,
        amount: this.normalizeAmount(debitNote.amount),
        fiscalNumber: debitNote.fiscalNumber,
        createdAt: debitNote.createdAt,
      })),
    };
  }

  private assertStoreAccess(storeId: string, actor: JwtPayload): void {
    if (!isSuperAdmin(actor.role) && storeId !== actor.storeId) {
      throw new ForbiddenException('You cannot access invoices from another store.');
    }
  }

  private hasValidCustomerSnapshot(snapshot: Record<string, unknown> | null | undefined): boolean {
    if (!snapshot) {
      return false;
    }

    const name = snapshot.name;
    const email = snapshot.email;
    return typeof name === 'string' && name.trim().length > 0 && typeof email === 'string';
  }

  private reconcileInvoiceFinancialState(invoice: Invoice): boolean {
    const currentAmountPaid = this.normalizeAmount(invoice.amountPaid);
    const currentBalance = this.normalizeAmount(invoice.balance);
    const currentStatus = invoice.status;

    const paidFromPayments = this.normalizeAmount(
      (invoice.payments ?? []).reduce(
        (acc, payment) => acc + this.normalizeAmount(payment.amount),
        0,
      ),
    );
    const totalCredited = this.normalizeAmount(
      (invoice.creditNotes ?? []).reduce(
        (acc, creditNote) => acc + this.normalizeAmount(creditNote.amount),
        0,
      ),
    );
    const totalDebited = this.normalizeAmount(
      (invoice.debitNotes ?? []).reduce(
        (acc, debitNote) => acc + this.normalizeAmount(debitNote.amount),
        0,
      ),
    );

    const normalizedTotal = this.normalizeAmount(invoice.total);
    const calculatedBalance = this.normalizeAmount(
      normalizedTotal - paidFromPayments - totalCredited + totalDebited,
    );

    invoice.amountPaid = paidFromPayments;
    invoice.balance = calculatedBalance <= 0 ? 0 : calculatedBalance;

    if (invoice.status !== InvoiceStatusEnum.CANCELLED) {
      if (totalCredited >= normalizedTotal && normalizedTotal > 0) {
        invoice.status = InvoiceStatusEnum.CREDITED;
      } else if (invoice.balance <= 0 && invoice.amountPaid > 0) {
        invoice.status = InvoiceStatusEnum.PAID;
      } else if (invoice.amountPaid > 0) {
        invoice.status = InvoiceStatusEnum.PARTIALLY_PAID;
      } else {
        invoice.status =
          invoice.issuedAt ||
          currentStatus === InvoiceStatusEnum.ISSUED ||
          currentStatus === InvoiceStatusEnum.PARTIALLY_PAID ||
          currentStatus === InvoiceStatusEnum.PAID
            ? InvoiceStatusEnum.ISSUED
            : InvoiceStatusEnum.DRAFT;
      }
    }

    return (
      currentAmountPaid !== invoice.amountPaid ||
      currentBalance !== invoice.balance ||
      currentStatus !== invoice.status
    );
  }

  private normalizeAmount(value: number | string | null | undefined): number {
    const numericValue = value === null || value === undefined ? 0 : Number(value);
    if (!Number.isFinite(numericValue)) {
      throw new BadRequestException('Numeric value must be finite.');
    }

    return this.invoiceCalculationService.normalizeAmount(numericValue);
  }
}
