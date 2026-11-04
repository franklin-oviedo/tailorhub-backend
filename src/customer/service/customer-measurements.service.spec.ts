import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerMeasurementsService } from './customer-measurements.service';
import { CustomerMeasurement } from '../../entities/customer-measurements.entity';
import { Customers } from '../../entities/customer.entity';

describe('CustomerMeasurementsService', () => {
  let service: CustomerMeasurementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerMeasurementsService,
        {
          provide: getRepositoryToken(CustomerMeasurement),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Customers),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerMeasurementsService>(CustomerMeasurementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
