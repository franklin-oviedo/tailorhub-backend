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

@Injectable()
export class AuthService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    private readonly jwtService: JwtService,
  ) {}
  /* c8 ignore stop */

  async register(registerDto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await this.usersRepository.findOne({
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

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.usersRepository.create({
      fullName: registerDto.fullName,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role ?? Role.CLIENT,
      store,
      storeId: store.id,
    });

    const savedUser = await this.usersRepository.save(user);
    return { accessToken: await this.signToken(savedUser) };
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return { accessToken: await this.signToken(user) };
  }

  private async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    };

    return this.jwtService.signAsync(payload);
  }
}
