import { Injectable } from '@nestjs/common';
import { CreateCustomerMeasurementDto } from '../dto/create-customer-measurement.dto';
import { UpdateCustomerMeasurementDto } from '../dto/update-customer-measurement.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CustomerMeasurement } from '../../entities/customer-measurements.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from '../../entities/customer.entity';

const isSuperAdmin = (role: string): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class CustomerMeasurementsService {

  constructor(
    @InjectRepository(CustomerMeasurement)
    private readonly customerMeasurementsRepository: Repository<CustomerMeasurement>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
  ) { }

  async create(
    dto: CreateCustomerMeasurementDto,
    actor: JwtPayload,
  ): Promise<CustomerMeasurement> {
    const customer = await this.customersRepository.findOne({
      where: { id: dto.customerId },
      relations: { store: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not exists.');
    }

    if (!isSuperAdmin(actor.role) && customer.store.id !== actor.storeId) {
      throw new ForbiddenException('Customer belongs to another store.');
    }

    const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id: dto.customerId } },
      relations: { customer: { store: true } },
    });

    if (customerMeasurement) {
      throw new BadRequestException(
        'Customer measurement already exists for this customer.',
      );
    }

    const newMeasurement = this.customerMeasurementsRepository.create({
      pantsWomen: dto.pantsWomen ?? null,
      shirts: dto.shirts ?? null,
      jackets: dto.jackets ?? null,
      dresses: dto.dresses ?? null,
      notes: dto.notes,
      customer: { id: dto.customerId },
    });

    return await this.customerMeasurementsRepository.save( newMeasurement );
  }

  async findOne(id: string, actor: JwtPayload): Promise<CustomerMeasurement> {

     const customerMeasurement = await this.customerMeasurementsRepository.findOne({
      where: { customer: { id } },
      relations: { customer: { store: true } },
    });

    if (!customerMeasurement) {
      throw new BadRequestException('Customer measurement not found.');
    }

    if (!isSuperAdmin(actor.role) && customerMeasurement.customer.store.id !== actor.storeId) {
      throw new ForbiddenException('Customer belongs to another store.');
    }

    return customerMeasurement;
  }

  async update(id: string, updateCustomerMeasurementDto: UpdateCustomerMeasurementDto, actor: JwtPayload) {
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

    if (updateCustomerMeasurementDto.pantsWomen !== undefined) {
      customerMeasurement.pantsWomen = updateCustomerMeasurementDto.pantsWomen ?? null;
    }
    if (updateCustomerMeasurementDto.shirts !== undefined) {
      customerMeasurement.shirts = updateCustomerMeasurementDto.shirts ?? null;
    }
    if (updateCustomerMeasurementDto.jackets !== undefined) {
      customerMeasurement.jackets = updateCustomerMeasurementDto.jackets ?? null;
    }
    if (updateCustomerMeasurementDto.dresses !== undefined) {
      customerMeasurement.dresses = updateCustomerMeasurementDto.dresses ?? null;
    }
    if (updateCustomerMeasurementDto.notes !== undefined) {
      customerMeasurement.notes = updateCustomerMeasurementDto.notes;
    }

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
