import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiBody,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Stores')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
@ApiForbiddenResponse({ description: 'Admin role required.' })
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a store (admin only)' })
  @ApiBody({ type: CreateStoreDto })
  @ApiOkResponse({ description: 'Store created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated email.' })
  create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'List stores (admin only)' })
  @ApiOkResponse({ description: 'Paginated stores list.' })
  findAll(@Query() query: ListStoresQueryDto) {
    return this.storesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get store by id (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Store found.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update store (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateStoreDto })
  @ApiOkResponse({ description: 'Store updated successfully.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated email.' })
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(id, updateStoreDto);
  }

  @Patch(':id/logo')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload store logo to Supabase (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Store logo uploaded successfully.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiBadRequestResponse({ description: 'Missing image, invalid file, or storage configuration error.' })
  uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.storesService.uploadLogo(id, file);
  }

  @Patch(':id/seal')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload store seal to Supabase (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Store seal uploaded successfully.' })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  @ApiBadRequestResponse({ description: 'Missing image, invalid file, or storage configuration error.' })
  uploadSeal(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.storesService.uploadSeal(id, file);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete store (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Store deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Store not found.' })
  async remove(@Param('id') id: string) {
    await this.storesService.remove(id);
    return { message: 'Store deleted successfully.' };
  }
}
