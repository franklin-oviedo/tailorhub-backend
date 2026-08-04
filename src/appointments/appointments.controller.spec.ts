import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  const appointmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const actor = { sub: 'u1', email: 'u@test.com', role: Role.EMPLOYEE, storeId: 's1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [{ provide: AppointmentsService, useValue: appointmentsService }],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    appointmentsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(actor, query);

    expect(appointmentsService.findAll).toHaveBeenCalledWith(actor, query);
  });

  it('returns success message on remove', async () => {
    appointmentsService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('a1', actor);

    expect(result).toEqual({ message: 'Appointment deleted successfully.' });
  });
});
