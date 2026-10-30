import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from '../service/customers.service';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlanPermissionsGuard } from '../../common/guards/plan-permissions.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Customers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class CustomersController {
    constructor(private readonly customersService: CustomersService) {}

    @Post()
    @ApiOperation({ summary: 'Create customer' })
    @ApiBody({ type: CreateCustomerDto })
    @ApiOkResponse({ description: 'Customer created successfully.' })
    @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
    createCustomer(
        @Body() createCustomerDto: CreateCustomerDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.customersService.createCustomer(createCustomerDto, user);
    }

    @Get()
    @ApiOperation({ summary: 'List customers' })
    @ApiOkResponse({ description: 'Customers retrieved successfully.' })
    getAllCustomer(@CurrentUser() user: JwtPayload){
        return this.customersService.getAllCustomer(user.storeId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by id' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiOkResponse({ description: 'Customer retrieved successfully.' })
    @ApiBadRequestResponse({ description: 'Customer not found.' })
    getCustomerById(@Param('id') id: string) {
        return this.customersService.getCustomerById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update customer' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiBody({ type: UpdateCustomerDto })
    @ApiOkResponse({ description: 'Customer updated successfully.' })
    @ApiBadRequestResponse({ description: 'Validation error or customer not found.' })
    updateCustomer(
        @Param('id') id: string, 
        @Body() updateCustomerDto: UpdateCustomerDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.customersService.updateCustomer(id, updateCustomerDto, user);
    }

}
