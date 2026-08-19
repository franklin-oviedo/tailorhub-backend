import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiBody, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({ type: CreateInvoiceDto, description: 'The data required to create a new invoice' })
  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @ApiOperation({ summary: 'Retrieve all invoices' })
  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @ApiOperation({ summary: 'Retrieve a single invoice by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the invoice to retrieve' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update an existing invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the invoice to update' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, updateInvoiceDto);
  }

  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the invoice to delete' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(+id);
  }
}
