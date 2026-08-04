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
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
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

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Products')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Create product' })
  @ApiOkResponse({ description: 'Product created successfully.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated products list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Product found.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Product updated successfully.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or store permissions.' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete product (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Product deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.productsService.remove(id, user);
    return { message: 'Product deleted successfully.' };
  }
}
