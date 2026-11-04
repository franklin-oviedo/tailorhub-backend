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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';
import { Store } from '../entities/store.entity';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class UsersService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
  ) {}
  /* c8 ignore stop */

  private resolveUserStoreId(user: User): string | undefined {
    return user.store?.id ?? (user as User & { storeId?: string }).storeId;
  }

  private resolveUserEmail(user: User): string | undefined {
    return user.customer?.email ?? user.employee?.email;
  }

  findMyProfile(userId: string) {
    return this.usersRepository.findOne({
      where: { id: userId },
      relations: ['store', 'customer', 'employee'],
    });
  }

  async create(createUserDto: CreateUserDto, actor: JwtPayload): Promise<User> {
    const role = createUserDto.role ?? Role.CLIENT;

    if (actor.role === Role.MANAGER && [Role.SUPER_ADMIN, Role.ADMIN].includes(role)) {
      throw new ForbiddenException('Managers cannot assign super admin roles.');
    }

    const targetStoreId = isSuperAdmin(actor.role)
      ? (createUserDto.storeId ?? actor.storeId)
      : actor.storeId;

    const store = await this.storesRepository.findOne({
      where: { id: targetStoreId },
    });
    if (!store) {
      throw new BadRequestException('Store does not exist.');
    }

    const duplicatedEmail = await this.usersRepository.findOne({
      where: [
        { employee: { email: createUserDto.email } },
        { customer: { email: createUserDto.email } },
      ],
      relations: { employee: true, customer: true, store: true },
    });
    if (duplicatedEmail) {
      throw new BadRequestException('Email is already in use.');
    }

    const password = await bcrypt.hash(createUserDto.password, 12);

    if (role === Role.CLIENT) {
      const customer = await this.customersRepository.save(
        this.customersRepository.create({
          name: createUserDto.fullName,
          email: createUserDto.email,
          phone: createUserDto.phone,
          store: { id: targetStoreId },
        }),
      );

      const user = this.usersRepository.create({
        role,
        password,
        isActive: true,
        customer,
        store: { id: targetStoreId },
      });
      return this.usersRepository.save(user);
    }

    const employee = await this.employeesRepository.save(
      this.employeesRepository.create({
        name: createUserDto.fullName,
        email: createUserDto.email,
        phone: createUserDto.phone,
        active: true,
        store: { id: targetStoreId },
      }),
    );

    const user = this.usersRepository.create({
      role,
      password,
      isActive: true,
      employee,
      store: { id: targetStoreId },
    });
    return this.usersRepository.save(user);
  }

  async findAll(
    actor: JwtPayload,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<Partial<User>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.store', 'store')
      .leftJoinAndSelect('user.customer', 'customer')
      .leftJoinAndSelect('user.employee', 'employee');

    if (!isSuperAdmin(actor.role)) {
      qb.andWhere('user.storeId = :storeId', { storeId: actor.storeId });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR employee.name ILIKE :search OR employee.email ILIKE :search)',
        {
          search: searchPattern,
        },
      );
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
      relations: ['store', 'customer', 'employee'],
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const targetStoreId = this.resolveUserStoreId(user);
    if (!isSuperAdmin(actor.role) && targetStoreId !== actor.storeId) {
      throw new ForbiddenException('You cannot access users from another store.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actor: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['store', 'customer', 'employee'],
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!isSuperAdmin(actor.role)) {
      if (actor.role === Role.MANAGER) {
        const targetStoreId = this.resolveUserStoreId(user);
        if (!targetStoreId || targetStoreId !== actor.storeId) {
          throw new ForbiddenException('Managers can only update users from their store.');
        }

        if (updateUserDto.storeId && updateUserDto.storeId !== targetStoreId) {
          throw new ForbiddenException('Managers cannot move users across stores.');
        }

        if (updateUserDto.role && [Role.SUPER_ADMIN, Role.ADMIN].includes(updateUserDto.role)) {
          throw new ForbiddenException('Managers cannot assign super admin roles.');
        }

        if (
          updateUserDto.isActive === false &&
          [Role.SUPER_ADMIN, Role.ADMIN].includes(user.role)
        ) {
          throw new ForbiddenException('Managers cannot disable super admin users.');
        }
      } else {
        if (actor.sub !== id) {
          throw new ForbiddenException('You can only update your own profile.');
        }

        if (updateUserDto.role && updateUserDto.role !== user.role) {
          throw new ForbiddenException('You cannot update your role.');
        }

        const targetStoreId = this.resolveUserStoreId(user);
        if (updateUserDto.storeId && (!targetStoreId || updateUserDto.storeId !== targetStoreId)) {
          throw new ForbiddenException('You cannot move users across stores.');
        }

        if (updateUserDto.isActive !== undefined && actor.sub !== id) {
          throw new ForbiddenException('You cannot change active status for another user.');
        }

        if (updateUserDto.isActive !== undefined && actor.sub === id) {
          throw new ForbiddenException('You cannot change your own active status.');
        }
      }
    }

    const currentEmail = this.resolveUserEmail(user);
    if (updateUserDto.email && updateUserDto.email !== currentEmail) {
      const duplicateUser = await this.usersRepository.findOne({
        where: [
          { employee: { email: updateUserDto.email } },
          { customer: { email: updateUserDto.email } },
        ],
        relations: { employee: true, customer: true },
      });
      if (duplicateUser && duplicateUser.id !== user.id) {
        throw new BadRequestException('Email is already in use.');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    const targetStoreId = updateUserDto.storeId ?? this.resolveUserStoreId(user);

    if (user.customer) {
      if (updateUserDto.fullName !== undefined) {
        user.customer.name = updateUserDto.fullName;
      }
      if (updateUserDto.email !== undefined) {
        user.customer.email = updateUserDto.email;
      }
      if (updateUserDto.phone !== undefined) {
        user.customer.phone = updateUserDto.phone;
      }
      if (targetStoreId) {
        user.customer.store = { id: targetStoreId } as Customers['store'];
      }
      await this.customersRepository.save(user.customer);
    }

    if (user.employee) {
      if (updateUserDto.fullName !== undefined) {
        user.employee.name = updateUserDto.fullName;
      }
      if (updateUserDto.email !== undefined) {
        user.employee.email = updateUserDto.email;
      }
      if (updateUserDto.phone !== undefined) {
        user.employee.phone = updateUserDto.phone;
      }
      if (targetStoreId) {
        user.employee.store = { id: targetStoreId } as Employee['store'];
      }
      if (updateUserDto.isActive !== undefined) {
        user.employee.active = updateUserDto.isActive;
      }
      await this.employeesRepository.save(user.employee);
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.password !== undefined) {
      user.password = updateUserDto.password;
    }

    if (targetStoreId) {
      user.store = { id: targetStoreId } as User['store'];
    }

    if (updateUserDto.isActive !== undefined) {
      if (user.role === Role.SUPER_ADMIN && updateUserDto.isActive === false) {
        throw new ForbiddenException('Super admin user cannot be disabled.');
      }
      user.isActive = updateUserDto.isActive;
    }

    return this.usersRepository.save(user);
  }

  async disable(id: string, actor: JwtPayload): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['store', 'customer', 'employee'],
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin user cannot be disabled.');
    }

    if (!isSuperAdmin(actor.role)) {
      if (actor.role === Role.MANAGER) {
        const targetStoreId = this.resolveUserStoreId(user);
        if (!targetStoreId || targetStoreId !== actor.storeId) {
          throw new ForbiddenException('Managers can only disable users from their store.');
        }

        if ([Role.SUPER_ADMIN, Role.ADMIN].includes(user.role)) {
          throw new ForbiddenException('Managers cannot disable super admin users.');
        }
      } else if (actor.sub !== id) {
        throw new ForbiddenException('You can only disable your own account.');
      }
    }

    user.isActive = false;
    if (user.employee) {
      user.employee.active = false;
      await this.employeesRepository.save(user.employee);
    }

    await this.usersRepository.save(user);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['store', 'customer', 'employee'],
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin user cannot be deleted.');
    }

    if (!isSuperAdmin(actor.role)) {
      if (actor.role === Role.MANAGER) {
        const targetStoreId = this.resolveUserStoreId(user);
        if (!targetStoreId || targetStoreId !== actor.storeId) {
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
