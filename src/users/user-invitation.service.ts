import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { InvitationStatus } from '../common/enums/invitation-status.enum';
import { UserInvitation } from '../entities/user-invitation.entity';
import { Store } from '../entities/store.entity';
import { User } from '../entities/user.entity';
import { CreateUserInvitationDto } from './dto/create-user-invitation.dto';

const isSuperAdmin = (role: Role): boolean => role === Role.SUPER_ADMIN || role === Role.ADMIN;

@Injectable()
export class UserInvitationService {
  constructor(
    @InjectRepository(UserInvitation)
    private readonly userInvitationsRepository: Repository<UserInvitation>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async createEmployeeInvitation(
    actor: JwtPayload,
    dto: CreateUserInvitationDto,
  ): Promise<{
    email: string;
    role: Role;
    token: string;
    invitationLink: string;
    expiresAt: Date;
    storeId: string;
  }> {
    return this.createInvitation(actor, actor.storeId, Role.EMPLOYEE, dto);
  }

  async createManagerInvitation(
    actor: JwtPayload,
    storeId: string,
    dto: CreateUserInvitationDto,
  ): Promise<{
    email: string;
    role: Role;
    token: string;
    invitationLink: string;
    expiresAt: Date;
    storeId: string;
  }> {
    if (!isSuperAdmin(actor.role)) {
      throw new ForbiddenException('Only super admin/admin can create manager invitations.');
    }

    return this.createInvitation(actor, storeId, Role.MANAGER, dto);
  }

  async assignManagerToStore(
    actor: JwtPayload,
    storeId: string,
    managerUserId: string,
  ): Promise<void> {
    if (!isSuperAdmin(actor.role)) {
      throw new ForbiddenException('Only super admin/admin can assign manager to store.');
    }

    const store = await this.storesRepository.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const user = await this.usersRepository.findOne({
      where: { id: managerUserId },
      relations: { customer: true, employee: true },
    });

    if (!user) {
      throw new NotFoundException('Manager user not found.');
    }

    if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) {
      throw new BadRequestException('Super admin/admin users cannot be assigned as manager.');
    }

    user.role = Role.MANAGER;
    user.store = store;
    await this.usersRepository.save(user);
  }

  private async createInvitation(
    actor: JwtPayload,
    storeId: string,
    targetRole: Role,
    dto: CreateUserInvitationDto,
  ): Promise<{
    email: string;
    role: Role;
    token: string;
    invitationLink: string;
    expiresAt: Date;
    storeId: string;
  }> {
    if (targetRole !== Role.EMPLOYEE && targetRole !== Role.MANAGER) {
      throw new BadRequestException('Invitation target role must be employee or manager.');
    }

    if (actor.role === Role.MANAGER && targetRole !== Role.EMPLOYEE) {
      throw new ForbiddenException('Managers can only invite employees.');
    }

    if (!isSuperAdmin(actor.role) && actor.storeId !== storeId) {
      throw new ForbiddenException('You can only invite users to your own store.');
    }

    const store = await this.storesRepository.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const expiresInHours = dto.expiresInHours ?? 72;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const token = randomBytes(32).toString('hex');

    const invitation = this.userInvitationsRepository.create({
      token,
      email: normalizedEmail,
      role: targetRole,
      status: InvitationStatus.PENDING,
      store,
      invitedByUserId: actor.sub,
      acceptedByUserId: null,
      acceptedAt: null,
      expiresAt,
    });

    await this.userInvitationsRepository.save(invitation);

    const frontendBaseUrl = process.env.FRONTEND_APP_URL ?? 'http://localhost:4200';
    const invitationLink = `${frontendBaseUrl.replace(/\/+$/, '')}/auth/invitations/accept?token=${token}`;

    return {
      email: normalizedEmail,
      role: targetRole,
      token,
      invitationLink,
      expiresAt,
      storeId: store.id,
    };
  }
}
