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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Create appointment' })
  @ApiOkResponse({ description: 'Appointment created successfully.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store access.' })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.create(createAppointmentDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated appointments list.' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointmentsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Appointment found.' })
  @ApiNotFoundResponse({ description: 'Appointment not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update appointment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Appointment updated successfully.' })
  @ApiNotFoundResponse({ description: 'Appointment not found.' })
  @ApiBadRequestResponse({ description: 'Validation or business rule error.' })
  @ApiForbiddenResponse({ description: 'Insufficient role or cross-store access.' })
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete appointment (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Appointment deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Appointment not found.' })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.appointmentsService.remove(id, user);
    return { message: 'Appointment deleted successfully.' };
  }
}
