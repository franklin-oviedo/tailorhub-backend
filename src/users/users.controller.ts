import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ApiMessageResponseDto } from '../common/dto/api-message-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({ description: 'Authenticated user profile.' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findMyProfile(user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List users with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated users list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'User found.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Cross-store access is not allowed.' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile or admin-managed user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'User updated successfully.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicated email.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'User deleted successfully.',
    type: ApiMessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Only admin or owner can delete this user.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.usersService.remove(id, user);
    return { message: 'User deleted successfully.' };
  }
}
