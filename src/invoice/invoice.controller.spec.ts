import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { Role } from '../common/enums/role.enum';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  const invoiceService = {
    createFromOrder: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateDraft: jest.fn(),
    issue: jest.fn(),
    registerPayment: jest.fn(),
    createCreditNote: jest.fn(),
    createDebitNote: jest.fn(),
    cancel: jest.fn(),
    generateFiscalReport: jest.fn(),
  };

  const actor = {
    sub: 'u1',
    email: 'manager@tailorhub.local',
    role: Role.MANAGER,
    storeId: 'store-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [{ provide: InvoiceService, useValue: invoiceService }],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createFromOrder', async () => {
    const dto = { orderId: 'order-1' };
    invoiceService.createFromOrder.mockResolvedValue({ id: 'inv-1' });

    await controller.createFromOrder(dto as never, actor as never);

    expect(invoiceService.createFromOrder).toHaveBeenCalledWith(dto, actor);
  });

  it('delegates issue', async () => {
    invoiceService.issue.mockResolvedValue({ id: 'inv-1', status: 'issued' });

    await controller.issue('inv-1', {}, actor as never);

    expect(invoiceService.issue).toHaveBeenCalledWith('inv-1', {}, actor);
  });
});
