import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CustomersService {

    constructor(
        @InjectRepository(Customers)
        private readonly customerRepository: Repository<Customers>
    ){}

    getCustomerById(id: string) {
        const customer =  this.customerRepository.findOne({
            where: { id }
        })

        if(!customer){
            throw new BadRequestException( 'Customer not exists.' );
        }

        return customer;
    }

    getAllCustomer(){
        return this.customerRepository.find()
    }
}
