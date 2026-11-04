import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ServicesService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';
import { PlanPermissionsGuard } from '../common/guards/plan-permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ModulePermission } from '../common/enums/module-permission.enum';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard, PlanPermissionsGuard)
@ApiTags('Services')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.SERVICES_MANAGE, ModulePermission.PRODUCTS_MANAGE)
  @ApiOperation({ summary: 'Create service' })
  @ApiBody({ type: CreateProductDto })
  @ApiOkResponse({ description: 'Service created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.create(createProductDto, user);
  }

  @Get()
  @Permissions(ModulePermission.SERVICES_MANAGE, ModulePermission.PRODUCTS_MANAGE)
  @ApiOperation({ summary: 'List services with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated services list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListProductsQueryDto) {
    return this.servicesService.findAll(user, query);
  }

  @Get(':id')
  @Permissions(ModulePermission.SERVICES_MANAGE, ModulePermission.PRODUCTS_MANAGE)
  @ApiOperation({ summary: 'Get service by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Service found.' })
  @ApiNotFoundResponse({ description: 'Service not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.servicesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @Permissions(ModulePermission.SERVICES_MANAGE, ModulePermission.PRODUCTS_MANAGE)
  @ApiOperation({ summary: 'Update service' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ description: 'Service updated successfully.' })
  @ApiNotFoundResponse({ description: 'Service not found.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @Permissions(ModulePermission.SERVICES_MANAGE, ModulePermission.PRODUCTS_MANAGE)
  @ApiOperation({ summary: 'Delete service (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Service deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Service not found.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.servicesService.remove(id, user);
    return { message: 'Service deleted successfully.' };
  }
}
