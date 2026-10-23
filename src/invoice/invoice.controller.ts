import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ModulePermission } from '../common/enums/module-permission.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
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

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('from-order')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Create invoice draft from an order' })
  @ApiBody({ type: CreateInvoiceFromOrderDto })
  @ApiOkResponse({ description: 'Invoice draft created.', type: InvoiceDocumentDto })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiConflictResponse({ description: 'Order already has a settled invoice or is not eligible for invoicing.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  createFromOrder(
    @Body() dto: CreateInvoiceFromOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.createFromOrder(dto, user);
  }

  @Get()
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'List invoices with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated invoices list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListInvoicesQueryDto) {
    return this.invoiceService.findAll(user, query);
  }

  @Get('fiscal-report')
  @Permissions(ModulePermission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Generate fiscal report dataset from invoices' })
  @ApiOkResponse({ description: 'Fiscal report generated from persisted invoices.' })
  generateFiscalReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: GenerateFiscalReportDto,
  ) {
    return this.invoiceService.generateFiscalReport(user, query);
  }

  @Get(':id')
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Get invoice detail/document by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Invoice detail.', type: InvoiceDocumentDto })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invoiceService.findOne(id, user);
  }

  @Patch(':id/draft')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Update draft invoice' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateInvoiceDraftDto })
  @ApiOkResponse({ description: 'Invoice draft updated.', type: InvoiceDocumentDto })
  @ApiConflictResponse({ description: 'Only draft invoices can be updated.' })
  updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDraftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.updateDraft(id, dto, user);
  }

  @Post(':id/issue')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Issue an invoice draft' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: IssueInvoiceDto })
  @ApiOkResponse({ description: 'Invoice issued.', type: InvoiceDocumentDto })
  issue(@Param('id') id: string, @Body() dto: IssueInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.invoiceService.issue(id, dto, user);
  }

  @Post(':id/payments')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Register invoice payment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: RegisterInvoicePaymentDto })
  @ApiOkResponse({ description: 'Payment registered and invoice balance updated.' })
  registerPayment(
    @Param('id') id: string,
    @Body() dto: RegisterInvoicePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.registerPayment(id, dto, user);
  }

  @Post(':id/credit-notes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Create credit note for an issued invoice' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CreateCreditNoteDto })
  @ApiOkResponse({ description: 'Credit note created and invoice adjusted.' })
  createCreditNote(
    @Param('id') id: string,
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.createCreditNote(id, dto, user);
  }

  @Post(':id/debit-notes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Create debit note for an issued invoice' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CreateDebitNoteDto })
  @ApiOkResponse({ description: 'Debit note created and invoice adjusted.' })
  createDebitNote(
    @Param('id') id: string,
    @Body() dto: CreateDebitNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.createDebitNote(id, dto, user);
  }

  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.INVOICES_MANAGE)
  @ApiOperation({ summary: 'Cancel invoice using logical status transition' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CancelInvoiceDto })
  @ApiOkResponse({ description: 'Invoice cancelled.', type: InvoiceDocumentDto })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoiceService.cancel(id, dto, user);
  }
}
