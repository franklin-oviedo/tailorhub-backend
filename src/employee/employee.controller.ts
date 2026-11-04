import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ModulePermission } from '../common/enums/module-permission.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';

@Controller('employee')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Employee')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.EMPLOYEES_MANAGE)
  @ApiOperation({ summary: 'Create employee' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiOkResponse({ description: 'Employee created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated email.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  create(@Body() createEmployeeDto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    return this.employeeService.create(createEmployeeDto, user);
  }

  @Get()
  @Permissions(ModulePermission.EMPLOYEES_MANAGE)
  @ApiOperation({ summary: 'List employees' })
  @ApiOkResponse({ description: 'Employees retrieved successfully.' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.employeeService.findAll(user);
  }

  @Get(':id')
  @Permissions(ModulePermission.EMPLOYEES_MANAGE)
  @ApiOperation({ summary: 'Get employee by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Employee found.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.employeeService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.EMPLOYEES_MANAGE)
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiOkResponse({ description: 'Employee updated successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated email.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeeService.update(id, updateEmployeeDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.EMPLOYEES_MANAGE)
  @ApiOperation({ summary: 'Delete employee' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Employee deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.employeeService.remove(id, user);
    return { message: 'Employee deleted successfully.' };
  }
}
