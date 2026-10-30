import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { OrderStatusEnum } from '../enums/order.enum';
import { DiscountTypeEnum, InvoiceStatusEnum, PaymentMethodEnum } from '../enums/invoice.enum';
import { Role } from '../common/enums/role.enum';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceItem } from '../entities/invoice-item.entity';
import { InvoicePayment } from '../entities/invoice-payment.entity';
import { CreditNote } from '../entities/credit-note.entity';
import { DebitNote } from '../entities/debit-note.entity';
import { Order } from '../entities/order.entity';

describe('InvoiceService', () => {
  let service: InvoiceService;
  const actor = {
    sub: 'user-1',
    email: 'manager@tailorhub.local',
    role: Role.MANAGER,
    storeId: 'store-1',
  };

  const ordersRepository = {
    findOne: jest.fn(),
  };

  const invoiceRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(async (payload) => payload),
    update: jest.fn(async () => ({ affected: 1 })),
  };

  const managerInvoiceRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => ({ id: 'inv-1', ...payload })),
    update: jest.fn(async () => ({ affected: 1 })),
    findOne: jest.fn(),
  };

  const managerInvoiceItemRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
  };

  const managerPaymentRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
  };

  const managerCreditNoteRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
  };

  const managerDebitNoteRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
  };

  const managerOrderRepo = {
    save: jest.fn(async (payload) => payload),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Invoice) {
        return managerInvoiceRepo;
      }
      if (entity === InvoiceItem) {
        return managerInvoiceItemRepo;
      }
      if (entity === InvoicePayment) {
        return managerPaymentRepo;
      }
      if (entity === CreditNote) {
        return managerCreditNoteRepo;
      }
      if (entity === DebitNote) {
        return managerDebitNoteRepo;
      }

      if (entity === Order) {
        return managerOrderRepo;
      }

      return {};
    }),
  };

  const dataSource = {
    transaction: jest.fn(async (handler: (m: typeof manager) => Promise<unknown>) =>
      handler(manager),
    ),
  };

  const calcService = {
    getDefaultCurrency: jest.fn(() => 'DOP'),
    getDefaultTaxRate: jest.fn(() => 18),
    normalizeAmount: jest.fn((value: number) => Number(Number(value).toFixed(2))),
    calculateInvoice: jest.fn(),
  };

  const numberService = {
    getNextInvoiceNumber: jest.fn(),
  };

  const fiscalDocumentService = {
    assignFiscalDocument: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    service = new InvoiceService(
      invoiceRepository as never,
      ordersRepository as never,
      dataSource as never,
      calcService as never,
      numberService as never,
      fiscalDocumentService as never,
    );
  });

  it('TEST 1 - should create DRAFT invoice from valid order', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.PENDING,
      totalAmount: 100,
      notes: 'order note',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 2,
          unitPrice: 50,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue(null);
    calcService.calculateInvoice.mockReturnValue({
      lines: [
        {
          orderItemId: 'order-item-1',
          description: 'Suit',
          quantity: 2,
          unitPrice: 50,
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          taxableBase: 100,
          taxRate: 18,
          taxAmount: 18,
          lineTotal: 118,
          isTaxable: true,
          snapshot: { productName: 'Suit' },
        },
      ],
      subtotal: 100,
      discountAmount: 0,
      taxableAmount: 100,
      exemptAmount: 0,
      taxAmount: 18,
      total: 118,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    const result = await service.createFromOrder({ orderId: 'order-1' }, actor as never);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(managerInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InvoiceStatusEnum.DRAFT,
        order: expect.objectContaining({ id: 'order-1' }),
        customer: expect.objectContaining({ id: 'customer-1' }),
      }),
    );
    expect(managerOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: OrderStatusEnum.IN_PROGRESS }),
    );
    expect(result).toEqual({ id: 'inv-1' });
  });

  it('TEST 1B - should return existing draft when order already has one', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.PENDING,
      totalAmount: 100,
      notes: 'order note',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 2,
          unitPrice: 50,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue({
      id: 'existing-draft-id',
      status: InvoiceStatusEnum.DRAFT,
    });
    const findOneSpy = jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'existing-draft-id', status: InvoiceStatusEnum.DRAFT } as never);

    const result = await service.createFromOrder({ orderId: 'order-1' }, actor as never);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(findOneSpy).toHaveBeenCalledWith('existing-draft-id', actor);
    expect(result).toEqual({ id: 'existing-draft-id', status: InvoiceStatusEnum.DRAFT });
  });

  it('TEST 1C - should reject invoice creation for completed orders', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.COMPLETED,
      totalAmount: 100,
      notes: 'order note',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 1,
          unitPrice: 100,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });

    await expect(service.createFromOrder({ orderId: 'order-1' }, actor as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('TEST 1D - should reject new invoice when order already has a settled invoice', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.IN_PROGRESS,
      totalAmount: 100,
      notes: 'order note',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 1,
          unitPrice: 100,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue({
      id: 'paid-invoice-id',
      status: InvoiceStatusEnum.PAID,
    });

    await expect(service.createFromOrder({ orderId: 'order-1' }, actor as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('TEST 2 - should persist historical snapshot even if source data changes', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.PENDING,
      totalAmount: 100,
      notes: 'order note',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Old Name', email: 'old@tailorhub.com', phone: '111' },
      items: [
        {
          id: 'order-item-1',
          quantity: 1,
          unitPrice: 100,
          product: { id: 'product-1', name: 'Old Product', description: 'Old description' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue(null);
    calcService.calculateInvoice.mockReturnValue({
      lines: [
        {
          orderItemId: 'order-item-1',
          description: 'Old Product',
          quantity: 1,
          unitPrice: 100,
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          taxableBase: 100,
          taxRate: 18,
          taxAmount: 18,
          lineTotal: 118,
          isTaxable: true,
          snapshot: { productName: 'Old Product' },
        },
      ],
      subtotal: 100,
      discountAmount: 0,
      taxableAmount: 100,
      exemptAmount: 0,
      taxAmount: 18,
      total: 118,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    await service.createFromOrder({ orderId: 'order-1' }, actor as never);

    expect(managerInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerSnapshot: expect.objectContaining({ name: 'Old Name', email: 'old@tailorhub.com' }),
      }),
    );
    expect(managerInvoiceItemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot: expect.objectContaining({ productName: 'Old Product' }) }),
    );
  });

  it('TEST 3 - should apply backend discount calculation, not frontend totals', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.PENDING,
      totalAmount: 100,
      notes: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 1,
          unitPrice: 100,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue(null);
    calcService.calculateInvoice.mockReturnValue({
      lines: [],
      subtotal: 100,
      discountAmount: 10,
      taxableAmount: 90,
      exemptAmount: 0,
      taxAmount: 16.2,
      total: 106.2,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    await service.createFromOrder(
      {
        orderId: 'order-1',
        discountType: DiscountTypeEnum.PERCENTAGE,
        discountValue: 10,
      },
      actor as never,
    );

    expect(calcService.calculateInvoice).toHaveBeenCalledWith(
      expect.any(Array),
      DiscountTypeEnum.PERCENTAGE,
      10,
    );
    expect(managerInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ discountAmount: 10, total: 106.2 }),
    );
  });

  it('TEST 4A - should ignore total, balance and status sent by frontend in create from order', async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatusEnum.PENDING,
      totalAmount: 100,
      notes: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      store: { id: 'store-1' },
      customer: { id: 'customer-1', name: 'Jane Doe', email: 'jane@tailorhub.com', phone: '809' },
      items: [
        {
          id: 'order-item-1',
          quantity: 1,
          unitPrice: 100,
          product: { id: 'product-1', name: 'Suit', description: 'Blue suit' },
        },
      ],
    });
    invoiceRepository.findOne.mockResolvedValue(null);
    calcService.calculateInvoice.mockReturnValue({
      lines: [
        {
          orderItemId: 'order-item-1',
          description: 'Suit',
          quantity: 1,
          unitPrice: 100,
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          taxableBase: 100,
          taxRate: 18,
          taxAmount: 18,
          lineTotal: 118,
          isTaxable: true,
          snapshot: null,
        },
      ],
      subtotal: 100,
      discountAmount: 0,
      taxableAmount: 100,
      exemptAmount: 0,
      taxAmount: 18,
      total: 118,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    await service.createFromOrder(
      {
        orderId: 'order-1',
        status: InvoiceStatusEnum.PAID,
        total: 999999,
        balance: 0,
      } as never,
      actor as never,
    );

    expect(managerInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InvoiceStatusEnum.DRAFT,
        total: 118,
        balance: 118,
      }),
    );
  });

  it('TEST 4 - should issue invoice and assign number + issued status', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      customer: { id: 'customer-1' },
      customerSnapshot: { name: 'Jane Doe', email: 'jane@tailorhub.com' },
      status: InvoiceStatusEnum.DRAFT,
      discountType: null,
      discountValue: 0,
      amountPaid: 0,
      items: [
        {
          id: 'inv-item-1',
          description: 'Suit',
          quantity: 1,
          unitPrice: 100,
          discountType: null,
          discountValue: 0,
          isTaxable: true,
          taxRate: 18,
          snapshot: null,
        },
      ],
    });
    calcService.calculateInvoice.mockReturnValue({
      lines: [{ id: 'inv-item-1', discountAmount: 0, taxableBase: 100, taxAmount: 18, lineTotal: 118 }],
      subtotal: 100,
      discountAmount: 0,
      taxableAmount: 100,
      exemptAmount: 0,
      taxAmount: 18,
      total: 118,
    });
    fiscalDocumentService.assignFiscalDocument.mockResolvedValue({
      fiscalDocumentType: null,
      fiscalNumber: null,
    });
    numberService.getNextInvoiceNumber.mockResolvedValue({
      invoiceSequence: 1,
      invoiceNumber: 'INV-00000001',
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1', status: InvoiceStatusEnum.ISSUED } as never);

    await service.issue('inv-1', {}, actor as never);

    expect(numberService.getNextInvoiceNumber).toHaveBeenCalled();
    expect(managerInvoiceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-00000001',
        invoiceSequence: 1,
        status: InvoiceStatusEnum.ISSUED,
      }),
    );
  });

  it('TEST 4B - should fail issue when customer snapshot is incomplete', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      customer: { id: 'customer-1' },
      customerSnapshot: { name: '', email: '' },
      status: InvoiceStatusEnum.DRAFT,
      discountType: null,
      discountValue: 0,
      amountPaid: 0,
      items: [
        {
          id: 'inv-item-1',
          description: 'Suit',
          quantity: 1,
          unitPrice: 100,
          discountType: null,
          discountValue: 0,
          isTaxable: true,
          taxRate: 18,
          snapshot: null,
        },
      ],
    });

    await expect(service.issue('inv-1', {}, actor as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('TEST 5 - should reject updating non-draft invoice', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      status: InvoiceStatusEnum.ISSUED,
      items: [],
    });

    await expect(service.updateDraft('inv-1', {}, actor as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('TEST 6 - should register partial payment and set PARTIALLY_PAID', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      status: InvoiceStatusEnum.ISSUED,
      total: 100,
      amountPaid: 0,
      balance: 100,
    });
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'inv-1', status: InvoiceStatusEnum.PARTIALLY_PAID, balance: 60 } as never);

    await service.registerPayment(
      'inv-1',
      { amount: 40, paymentMethod: PaymentMethodEnum.CASH },
      actor as never,
    );

    expect(managerInvoiceRepo.update).toHaveBeenCalledWith('inv-1', {
      amountPaid: 40,
      balance: 60,
      status: InvoiceStatusEnum.PARTIALLY_PAID,
    });
  });

  it('TEST 7 - should register full payment and set PAID', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      order: { id: 'order-1', status: OrderStatusEnum.IN_PROGRESS },
      status: InvoiceStatusEnum.ISSUED,
      total: 100,
      amountPaid: 0,
      balance: 100,
      payments: [],
      creditNotes: [],
      debitNotes: [],
    });
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'inv-1', status: InvoiceStatusEnum.PAID, balance: 0 } as never);

    await service.registerPayment(
      'inv-1',
      { amount: 100, paymentMethod: PaymentMethodEnum.BANK_TRANSFER },
      actor as never,
    );

    expect(managerInvoiceRepo.update).toHaveBeenCalledWith('inv-1', {
      amountPaid: 100,
      balance: 0,
      status: InvoiceStatusEnum.PAID,
    });
    expect(managerOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: OrderStatusEnum.COMPLETED }),
    );
  });

  it('TEST 8 - should reject overpayment greater than balance', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      status: InvoiceStatusEnum.ISSUED,
      total: 100,
      amountPaid: 0,
      balance: 30,
      payments: [{ amount: 70 }],
      creditNotes: [],
      debitNotes: [],
    });

    await expect(
      service.registerPayment(
        'inv-1',
        { amount: 31, paymentMethod: PaymentMethodEnum.CARD },
        actor as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TEST 9 - should request unique numbering on each issue flow', async () => {
    managerInvoiceRepo.findOne.mockImplementation(async (options: { where?: { id?: string } }) => {
      const id = options?.where?.id;
      if (!id) {
        return null;
      }

      return {
        id,
        store: { id: 'store-1' },
        customer: { id: 'customer-1' },
        customerSnapshot: { name: 'Customer Name', email: 'customer@test.com' },
        status: InvoiceStatusEnum.DRAFT,
        discountType: null,
        discountValue: 0,
        amountPaid: 0,
        items: [
          {
            id: id === 'inv-1' ? 'item-1' : 'item-2',
            description: id === 'inv-1' ? 'A' : 'B',
            quantity: 1,
            unitPrice: 10,
            discountType: null,
            discountValue: 0,
            isTaxable: true,
            taxRate: 18,
            snapshot: null,
          },
        ],
      };
    });
    calcService.calculateInvoice.mockReturnValue({
      lines: [
        {
          id: 'item-1',
          discountAmount: 0,
          taxableBase: 10,
          taxAmount: 1.8,
          lineTotal: 11.8,
        },
      ],
      subtotal: 10,
      discountAmount: 0,
      taxableAmount: 10,
      exemptAmount: 0,
      taxAmount: 1.8,
      total: 11.8,
    });
    fiscalDocumentService.assignFiscalDocument.mockResolvedValue({
      fiscalDocumentType: null,
      fiscalNumber: null,
    });
    numberService.getNextInvoiceNumber
      .mockResolvedValueOnce({ invoiceSequence: 11, invoiceNumber: 'INV-00000011' })
      .mockResolvedValueOnce({ invoiceSequence: 12, invoiceNumber: 'INV-00000012' });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'any' } as never);

    await Promise.all([
      service.issue('inv-1', {}, actor as never),
      service.issue('inv-2', {}, actor as never),
    ]);

    expect(numberService.getNextInvoiceNumber).toHaveBeenCalledTimes(2);
    expect(managerInvoiceRepo.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ invoiceNumber: 'INV-00000011' }),
    );
    expect(managerInvoiceRepo.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ invoiceNumber: 'INV-00000012' }),
    );
  });

  it('TEST 10 - should block cross-store access to preserve invoice integrity', async () => {
    invoiceRepository.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'other-store' },
      items: [],
      payments: [],
      creditNotes: [],
      customerSnapshot: { name: 'Historic Name' },
      orderSnapshot: { id: 'order-1' },
    });

    await expect(service.findOne('inv-1', actor as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('TEST 11 - should create debit note linked to invoice and increase balance only', async () => {
    managerInvoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      store: { id: 'store-1' },
      status: InvoiceStatusEnum.ISSUED,
      total: 118,
      amountPaid: 20,
      balance: 98,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    await service.createDebitNote(
      'inv-1',
      { reason: 'Price adjustment', amount: 10 },
      actor as never,
    );

    expect(managerDebitNoteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Price adjustment', amount: 10 }),
    );
    expect(managerInvoiceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 118,
        balance: 108,
      }),
    );
  });

  it('TEST 12 - should map numeric string values from database without failing in findOne', async () => {
    invoiceRepository.findOne.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-0001',
      fiscalNumber: null,
      fiscalDocumentType: null,
      status: InvoiceStatusEnum.DRAFT,
      store: {
        id: 'store-1',
        name: 'Main Store',
        email: 'store@test.com',
        phone: '8090000000',
        address: 'Santo Domingo',
      },
      currency: 'DOP',
      subtotal: '100.00',
      discountAmount: '0.00',
      taxableAmount: '100.00',
      exemptAmount: '0.00',
      taxAmount: '18.00',
      total: '118.00',
      amountPaid: '0.00',
      balance: '118.00',
      issuedAt: null,
      dueAt: null,
      notes: null,
      termsAndConditions: null,
      customerSnapshot: { name: 'Jane Doe' },
      orderSnapshot: { id: 'order-1' },
      items: [
        {
          id: 'item-1',
          orderItem: null,
          description: 'Suit',
          quantity: 1,
          unitPrice: '100.00',
          discountType: null,
          discountValue: '0.00',
          discountAmount: '0.00',
          taxableBase: '100.00',
          taxRate: '18.00',
          taxAmount: '18.00',
          lineTotal: '118.00',
        },
      ],
      payments: [
        {
          id: 'payment-1',
          amount: '10.00',
          paymentMethod: PaymentMethodEnum.CASH,
          reference: null,
          paidAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      creditNotes: [
        {
          id: 'credit-1',
          reason: 'test',
          amount: '5.00',
          fiscalNumber: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      debitNotes: [
        {
          id: 'debit-1',
          reason: 'test',
          amount: '2.00',
          fiscalNumber: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.findOne('inv-1', actor as never);

    expect(result.total).toBe(118);
    expect(result.balance).toBe(105);
    expect(result.items[0].unitPrice).toBe(100);
    expect(result.payments[0].amount).toBe(10);
  });

  it('TEST 13 - should reconcile stale partially_paid to paid when payments fully settle invoice', async () => {
    invoiceRepository.findOne.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-0001',
      fiscalNumber: null,
      fiscalDocumentType: null,
      status: InvoiceStatusEnum.PARTIALLY_PAID,
      store: {
        id: 'store-1',
        name: 'Main Store',
        email: 'store@test.com',
        phone: '8090000000',
        address: 'Santo Domingo',
      },
      currency: 'DOP',
      subtotal: 18000,
      discountAmount: 0,
      taxableAmount: 18000,
      exemptAmount: 0,
      taxAmount: 3240,
      total: 21240,
      amountPaid: 0,
      balance: 21240,
      issuedAt: new Date('2026-09-09T04:45:22.611Z'),
      dueAt: null,
      notes: null,
      termsAndConditions: null,
      customerSnapshot: { name: 'Michell Cano' },
      orderSnapshot: { id: 'order-1' },
      items: [],
      payments: [
        {
          id: 'payment-1',
          amount: 21240,
          paymentMethod: PaymentMethodEnum.CASH,
          reference: null,
          paidAt: new Date('2026-09-09T04:45:25.325Z'),
        },
      ],
      creditNotes: [],
      debitNotes: [],
    });

    const result = await service.findOne('inv-1', actor as never);

    expect(result.status).toBe(InvoiceStatusEnum.PAID);
    expect(result.amountPaid).toBe(21240);
    expect(result.balance).toBe(0);
    expect(invoiceRepository.update).toHaveBeenCalledWith('inv-1', {
      amountPaid: 21240,
      balance: 0,
      status: InvoiceStatusEnum.PAID,
    });
  });

  it('TEST 14 - should update invoice status and balance without persisting loaded credit notes', async () => {
    const invoice = {
      id: 'inv-1',
      store: { id: 'store-1' },
      status: InvoiceStatusEnum.ISSUED,
      total: 100,
      balance: 100,
      creditNotes: [{ id: 'credit-1', amount: 10, reason: 'old' }],
    };

    managerInvoiceRepo.findOne
      .mockResolvedValueOnce(invoice)
      .mockResolvedValueOnce(invoice);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'inv-1' } as never);

    await service.createCreditNote(
      'inv-1',
      { reason: 'price correction', amount: 25 },
      actor as never,
    );

    expect(managerCreditNoteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'price correction',
        amount: 25,
        invoice: expect.objectContaining({ id: 'inv-1' }),
      }),
    );
    expect(managerInvoiceRepo.update).toHaveBeenCalledWith('inv-1', {
      status: InvoiceStatusEnum.ISSUED,
      balance: 75,
    });
    expect(managerInvoiceRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ creditNotes: expect.anything() }),
    );
  });
});
