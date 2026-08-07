import { Injectable } from '@nestjs/common';
import { CreateCustomerMeasurementDto } from './dto/create-customer-measurement.dto';
import { UpdateCustomerMeasurementDto } from './dto/update-customer-measurement.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from 'src/common/enums/role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { CustomerMeasurement } from 'src/entities/customer-measurements.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

const isSuperAdmin = (role: string): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class CustomerMeasurementsService {

  constructor(
    @InjectRepository(CustomerMeasurement)
    private readonly customerMeasurementsRepository: Repository<CustomerMeasurement>,
  ) { }

  async create(
    dto: CreateCustomerMeasurementDto,
    actor: JwtPayload,
  ): Promise<CustomerMeasurement> {
    if (!isSuperAdmin(actor.role)) {
      throw new ForbiddenException( 'You do not have permission to create measurements.' );
    }

    const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id: dto.customerId } },
      relations: { customer: { store: true } },
    });

    if (customerMeasurement) {
      if (customerMeasurement.customer.store.id !== actor.storeId) {
        throw new ForbiddenException('Customer belongs to another store.');
      }

      throw new BadRequestException(
        'Customer measurement already exists for this customer.',
      );
    }

    const newMeasurement = this.customerMeasurementsRepository.create({
      chest: dto.chest,
      waist: dto.waist,
      hips: dto.hips,
      neck: dto.neck,
      sleeve: dto.sleeve,
      inseam: dto.inseam,
      notes: dto.notes,
      customer: { id: dto.customerId },
    });

    return await this.customerMeasurementsRepository.save( newMeasurement );
  }

  async findOne(id: string): Promise<CustomerMeasurement> {

     const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id } },
      relations: { customer: true },
    });

    if (!customerMeasurement) {
      throw new BadRequestException('Customer measurement not found.');
    }

    return customerMeasurement;
  }

  async update(updateCustomerMeasurementDto: UpdateCustomerMeasurementDto, actor: JwtPayload) {
    const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id: updateCustomerMeasurementDto.customerId } },
      relations: { customer: { store: true } },
    });

    if (!customerMeasurement) {
      throw new BadRequestException('Customer measurement not found.');
    }

    if (customerMeasurement.customer.store.id !== actor.storeId) {
      throw new ForbiddenException('Customer belongs to another store.');
    }

    Object.assign(customerMeasurement, updateCustomerMeasurementDto);
    return await this.customerMeasurementsRepository.save(customerMeasurement);
  }

  async remove(id: string, actor: JwtPayload) {
    const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id } },
      relations: { customer: { store: true } },
    });

    if (!customerMeasurement) {
      throw new BadRequestException('Customer measurement not found.');
    }

    if (customerMeasurement.customer.store.id !== actor.storeId) {
      throw new ForbiddenException('Customer belongs to another store.');
    }

    return await this.customerMeasurementsRepository.remove(customerMeasurement);
  }
}
