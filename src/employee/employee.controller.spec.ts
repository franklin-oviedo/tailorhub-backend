import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { UserInvitationService } from '../users/user-invitation.service';

describe('EmployeeController', () => {
  let controller: EmployeeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        {
          provide: EmployeeService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UserInvitationService,
          useValue: {
            createEmployeeInvitation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmployeeController>(EmployeeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
