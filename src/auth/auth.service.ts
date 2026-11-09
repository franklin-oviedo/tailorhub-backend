import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Store } from '../entities/store.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkGoogleCalendarDto } from './dto/link-google-calendar.dto';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class AuthService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}
  /* c8 ignore stop */

  async register(registerDto: RegisterDto): Promise<{ accessToken: string }> {
    const requestedRole = registerDto.role ?? Role.CLIENT;

    if (requestedRole !== Role.CLIENT) {
      throw new BadRequestException('Public registration only allows the client role.');
    }

    const user = await this.usersRepository.findOne({
      where: [
        { employee: { email: registerDto.email } },
        { customer: { email: registerDto.email } },
      ],
      relations: { employee: true, store: true, customer: true },
    });

    if (user) {
      throw new BadRequestException('Email is already in use.');
    }

    const store = await this.storesRepository.findOne({
      where: { id: registerDto.storeId },
    });

    if (!store) {
      throw new BadRequestException('Store does not exist.');
    }

    const customer = this.customersRepository.create({
      name: registerDto.fullName,
      email: registerDto.email,
      phone: registerDto.phone,
      store,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const newUser = this.usersRepository.create({
      customer: await this.customersRepository.save(customer),
      password: hashedPassword,
      role: Role.CLIENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      store,
    });

    const savedUser = await this.usersRepository.save(newUser);
    return { accessToken: await this.signToken(savedUser) };
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersRepository.findOne({
      where: [
        { employee: { email: loginDto.email } },
        { customer: { email: loginDto.email } },
      ],
      relations: { employee: true, store: true, customer: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User account is disabled.');
    }

    if (user.authProvider === AuthProvider.GOOGLE) {
      throw new UnauthorizedException('Use Google authentication for this account.');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return { accessToken: await this.signToken(user) };
  }

  async loginWithGoogle(googleLoginDto: GoogleLoginDto): Promise<{ accessToken: string }> {
    const googleUser = await this.verifyGoogleToken(googleLoginDto.credential);

    const user = await this.usersRepository.findOne({
      where: [
        { googleId: googleUser.googleId },
        { employee: { email: googleUser.email } },
        { customer: { email: googleUser.email } },
      ],
      relations: { employee: true, store: true, customer: true },
    });

    if (user) {
      if (user.isActive === false) {
        throw new UnauthorizedException('User account is disabled.');
      }

      if (!user.googleId && googleUser.googleId) {
        user.googleId = googleUser.googleId;
      }

      if (!user.authProvider || user.authProvider === AuthProvider.LOCAL) {
        user.authProvider = AuthProvider.GOOGLE;
      }

      if (googleUser.picture && !user.avatarUrl) {
        user.avatarUrl = googleUser.picture;
      }

      if (googleUser.firstName || googleUser.lastName) {
        const fullName = [googleUser.firstName, googleUser.lastName].filter(Boolean).join(' ').trim();
        if (user.customer && fullName) {
          user.customer.name = fullName;
          await this.customersRepository.save(user.customer);
        }
      }

      await this.usersRepository.save(user);
      return { accessToken: await this.signToken(user) };
    }

    const store = googleLoginDto.storeId
      ? await this.storesRepository.findOne({ where: { id: googleLoginDto.storeId } })
      : await this.resolveDefaultStore();

    if (!store) {
      throw new BadRequestException(
        'Store does not exist. Provide a valid storeId or configure DEFAULT_STORE_ID.',
      );
    }

    const customer = this.customersRepository.create({
      name: [googleUser.firstName, googleUser.lastName].filter(Boolean).join(' ').trim() || googleUser.email.split('@')[0],
      email: googleUser.email,
      phone: googleLoginDto.phone ?? 'N/A',
      store,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCustomer = await this.customersRepository.save(customer);
    const placeholderPassword = await bcrypt.hash(`google-oauth-${Date.now()}-${Math.random().toString(36).slice(2)}`, 12);

    const newUser = this.usersRepository.create({
      customer: savedCustomer,
      password: placeholderPassword,
      role: Role.CLIENT,
      authProvider: AuthProvider.GOOGLE,
      googleId: googleUser.googleId,
      avatarUrl: googleUser.picture ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      store,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(newUser);
    return { accessToken: await this.signToken(savedUser) };
  }

  async linkGoogleCalendar(
    actor: JwtPayload,
    dto: LinkGoogleCalendarDto,
  ): Promise<{ linked: boolean; calendarEmail: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: actor.sub },
      relations: { employee: true, customer: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User account is disabled.');
    }

    const expectedEmail =
      (user.customer?.email ?? user.employee?.email ?? '').trim().toLowerCase();

    if (!expectedEmail) {
      throw new ForbiddenException(
        'User does not have an email configured in TailorHub for Google Calendar linking.',
      );
    }

    const linked = await this.googleCalendarService.linkCalendarToUser(
      user.id,
      dto.authorizationCode,
      expectedEmail,
      dto.redirectUri,
    );

    return {
      linked: true,
      calendarEmail: linked.calendarEmail,
    };
  }

  private async resolveDefaultStore(): Promise<Store | null> {
    const configuredStoreId = this.configService.get<string>('DEFAULT_STORE_ID');

    if (configuredStoreId) {
      const configuredStore = await this.storesRepository.findOne({
        where: { id: configuredStoreId },
      });

      if (configuredStore) {
        return configuredStore;
      }
    }

    const stores = await this.storesRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    return stores[0] ?? null;
  }

  private async verifyGoogleToken(credential: string): Promise<{
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string | null;
  }> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!googleClientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured.');
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const audience = String(payload.aud ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const googleId = String(payload.sub ?? '').trim();

    if (audience !== googleClientId) {
      throw new UnauthorizedException('Google token audience does not match the configured client ID.');
    }

    if (!googleId || !email) {
      throw new UnauthorizedException('Google token is missing required claims.');
    }

    const emailVerified = payload.email_verified;
    if (emailVerified !== true && emailVerified !== 'true') {
      throw new UnauthorizedException('Google email is not verified.');
    }

    return {
      googleId,
      email,
      firstName: String(payload.given_name ?? '').trim(),
      lastName: String(payload.family_name ?? '').trim(),
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    };
  }

  private async signToken(user: User): Promise<string> {
    const email = user.customer?.email ?? user.employee?.email ?? (user as User & { email?: string }).email ?? '';
    const storeId = user.store?.id ?? (user as User & { storeId?: string }).storeId ?? '';

    const payload: JwtPayload = {
      sub: user.id,
      email,
      role: user.role,
      storeId,
    };

    return this.jwtService.signAsync(payload);
  }
}
