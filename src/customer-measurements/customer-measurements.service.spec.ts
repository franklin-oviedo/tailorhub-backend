import { Test, TestingModule } from '@nestjs/testing';
import { CustomerMeasurementsService } from './customer-measurements.service';

describe('CustomerMeasurementsService', () => {
  let service: CustomerMeasurementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerMeasurementsService],
    }).compile();

    service = module.get<CustomerMeasurementsService>(CustomerMeasurementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
