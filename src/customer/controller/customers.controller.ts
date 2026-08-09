import { Controller, UseGuards, Get, Param } from '@nestjs/common';
import { CustomersService } from '../service/customers.service';
import { ApiTags, ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PlanPermissionsGuard } from 'src/common/guards/plan-permissions.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Customers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class CustomersController {
    constructor(private readonly customersService: CustomersService) {}

    @Get()
    getAllCustomer(){
        return this.customersService.getAllCustomer()
    }

    @Get(':id')
    getCustomerById(@Param('id') id: string) {
        return this.customersService.getCustomerById(id);
    }

}
