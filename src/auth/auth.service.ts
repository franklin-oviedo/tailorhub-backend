import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Store } from '../entities/store.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Customers } from '../entities/customer.entity';
import { Employee } from '../entities/employee.entity';

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

  async login(loginDto: LoginDto ): Promise<{ accessToken: string }> {
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

    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return { accessToken: await this.signToken(user) };
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
