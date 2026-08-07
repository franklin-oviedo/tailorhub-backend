import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CustomerMeasurementsService } from './customer-measurements.service';
import { CreateCustomerMeasurementDto } from './dto/create-customer-measurement.dto';
import { UpdateCustomerMeasurementDto } from './dto/update-customer-measurement.dto';
import { PlanPermissionsGuard } from 'src/common/guards/plan-permissions.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { ModulePermission } from 'src/common/enums/module-permission.enum';
import { ApiOperation, ApiBody, ApiOkResponse, ApiBadRequestResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('customer-measurements')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Customer Measurements')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class CustomerMeasurementsController {
  constructor(private readonly customerMeasurementsService: CustomerMeasurementsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.CUSTOMER_MEASUREMENTS_MANAGE)
  @ApiOperation({ summary: 'Create customer measurement' })
  @ApiBody({ type: CreateCustomerMeasurementDto })
  @ApiOkResponse({ description: 'Customer measurement created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store data usage.' })
  create(
    @Body() createCustomerMeasurementDto: CreateCustomerMeasurementDto,
    @CurrentUser() user: JwtPayload) {
    return this.customerMeasurementsService.create(createCustomerMeasurementDto, user);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.CLIENT)
  @Permissions(ModulePermission.CUSTOMER_MEASUREMENTS_VIEW, ModulePermission.CUSTOMER_MEASUREMENTS_MANAGE)
  @ApiOperation({ summary: 'Get customer measurement by ID' })
  @ApiOkResponse({ description: 'Customer measurement retrieved successfully.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store data usage.' })
  findOne(@Param('id') id: string) {
    return this.customerMeasurementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.CUSTOMER_MEASUREMENTS_MANAGE)
  @ApiOperation({ summary: 'Update customer measurement' })
  @ApiBody({ type: UpdateCustomerMeasurementDto })
  @ApiOkResponse({ description: 'Customer measurement updated successfully.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store data usage.' })
  update(@Body() updateCustomerMeasurementDto: UpdateCustomerMeasurementDto, @CurrentUser() user: JwtPayload) {
    return this.customerMeasurementsService.update(updateCustomerMeasurementDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.customerMeasurementsService.remove(id, user);
  }
}