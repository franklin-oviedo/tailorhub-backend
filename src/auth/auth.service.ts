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
import { Customers } from 'src/entities/customer.entity';

@Injectable()
export class AuthService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customers)
    private readonly customersRepository: Repository<Customers>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    private readonly jwtService: JwtService,
  ) {}
  /* c8 ignore stop */

  async register(registerDto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await this.customersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
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
      phone: registerDto.phone, // You might want to add a phone field in the RegisterDto or handle it differently
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.usersRepository.create({
      customer: customer,
      password: hashedPassword,
      role: registerDto.role ?? Role.CLIENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      store: store,
    });

    const savedUser = await this.usersRepository.save(user);
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

    console.log('User found:', user); // Debugging line
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    console.log('Password matches:', passwordMatches); // Debugging line
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return { accessToken: await this.signToken(user) };
  }

  private async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.customer?.email ?? user.employee?.email,
      role: user.role,
      storeId: user.store.id,
    };

    return this.jwtService.signAsync(payload);
  }
}
