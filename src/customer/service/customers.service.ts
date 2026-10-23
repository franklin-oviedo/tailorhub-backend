import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from '../../entities/customer.entity';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomersService {

    constructor(
        @InjectRepository(Customers)
        private readonly customerRepository: Repository<Customers>
    ){}

    async createCustomer(dto: CreateCustomerDto, actor: JwtPayload): Promise<Customers> {
        const customer = this.customerRepository.create({
            ...dto,
            store: { id: actor.storeId },
        });

        return await this.customerRepository.save(customer);
    }

    async updateCustomer(id: string, dto: UpdateCustomerDto, actor: JwtPayload): Promise<Customers> {
        const customer = await this.customerRepository.findOne({
            relations: { store: true },
            where: { id },
        });

        if (!customer) {
            throw new BadRequestException('Customer not exists.');
        }

        if (customer.store.id !== actor.storeId) {
            throw new ForbiddenException('Customer belongs to another store.');
        }

        Object.assign(customer, dto);
        return await this.customerRepository.save(customer);
    }

    async getCustomerById(id: string) {
        const customer = await this.customerRepository.findOne({
            relations: { store: true },
            where: { id }
        });

        if (!customer) {
            throw new BadRequestException( 'Customer not exists.' );
        }

        return customer;
    }

    getAllCustomer(storeId: string){
        return this.customerRepository.find({
            relations: { store: true },
            where: { store: { id: storeId } }
        });
    }
}
