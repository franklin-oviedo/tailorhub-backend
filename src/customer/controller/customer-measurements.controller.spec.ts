import { Test, TestingModule } from '@nestjs/testing';
import { CustomerMeasurementsController } from './customer-measurements.controller';
import { CustomerMeasurementsService } from '../service/customer-measurements.service';

describe('CustomerMeasurementsController', () => {
  let controller: CustomerMeasurementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerMeasurementsController],
      providers: [CustomerMeasurementsService],
    }).compile();

    controller = module.get<CustomerMeasurementsController>(CustomerMeasurementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
