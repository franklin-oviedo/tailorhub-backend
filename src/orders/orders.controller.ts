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
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Create order' })
  @ApiOkResponse({ description: 'Order created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store data usage.' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated orders list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Order found.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Order status updated successfully.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store access.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete order (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Order deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.ordersService.remove(id, user);
    return { message: 'Order deleted successfully.' };
  }
}
