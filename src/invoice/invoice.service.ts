import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InvoiceService {

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  create(createInvoiceDto: CreateInvoiceDto) {
    const invoice = this.invoiceRepository.create(createInvoiceDto);
    return this.invoiceRepository.save(invoice);
  }

  findAll() {
    return this.invoiceRepository.find();
  }

  findOne(id: number) {
    return this.invoiceRepository.findOneBy({ id });
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    await this.invoiceRepository.update(id, updateInvoiceDto);
    return this.invoiceRepository.findOneBy({ id });
  }

  async remove(id: number) {
    await this.invoiceRepository.delete(id);
    return { deleted: true };
  }
}
