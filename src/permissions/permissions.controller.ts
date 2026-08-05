import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
@ApiForbiddenResponse({ description: 'Super admin role required.' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create permission' })
  @ApiOkResponse({ description: 'Permission created successfully.' })
  @ApiBody({ type: CreatePermissionDto })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated name.' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'List permissions' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get permission by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Permission found.' })
  @ApiNotFoundResponse({ description: 'Permission not found.' })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update permission by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiOkResponse({ description: 'Permission updated successfully.' })
  @ApiNotFoundResponse({ description: 'Permission not found.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated name.' })
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete permission by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApiMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Permission not found.' })
  async remove(@Param('id') id: string) {
    await this.permissionsService.remove(id);
    return { message: 'Permission deleted successfully.' };
  }
}
