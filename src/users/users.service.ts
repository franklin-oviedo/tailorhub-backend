import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class UsersService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  /* c8 ignore stop */

  findMyProfile(userId: string) {
    return this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'fullName', 'email', 'role', 'storeId', 'createdAt', 'updatedAt'],
    });
  }

  async findAll(
    actor: JwtPayload,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<Partial<User>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.role',
        'user.storeId',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('user.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: searchPattern,
      });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string, actor: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'fullName', 'email', 'role', 'storeId', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!isSuperAdmin(actor.role) && user.storeId !== actor.storeId) {
      throw new ForbiddenException('You cannot access users from another store.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actor: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!isSuperAdmin(actor.role)) {
      if (actor.role === Role.MANAGER) {
        if (user.storeId !== actor.storeId) {
          throw new ForbiddenException('Managers can only update users from their store.');
        }

        if (updateUserDto.storeId && updateUserDto.storeId !== user.storeId) {
          throw new ForbiddenException('Managers cannot move users across stores.');
        }

        if (updateUserDto.role && [Role.SUPER_ADMIN, Role.ADMIN].includes(updateUserDto.role)) {
          throw new ForbiddenException('Managers cannot assign super admin roles.');
        }
      } else {
        if (actor.sub !== id) {
          throw new ForbiddenException('You can only update your own profile.');
        }

        if (updateUserDto.role && updateUserDto.role !== user.role) {
          throw new ForbiddenException('You cannot update your role.');
        }

        if (updateUserDto.storeId && updateUserDto.storeId !== user.storeId) {
          throw new ForbiddenException('You cannot move users across stores.');
        }
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new BadRequestException('Email is already in use.');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!isSuperAdmin(actor.role)) {
      if (actor.role === Role.MANAGER) {
        if (user.storeId !== actor.storeId) {
          throw new ForbiddenException('Managers can only delete users from their store.');
        }

        if ([Role.SUPER_ADMIN, Role.ADMIN].includes(user.role)) {
          throw new ForbiddenException('Managers cannot delete super admin users.');
        }
      } else if (actor.sub !== id) {
        throw new ForbiddenException('You can only delete your own account.');
      }
    }

    await this.usersRepository.remove(user);
  }
}
