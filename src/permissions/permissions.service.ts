/* c8 ignore file */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('A permission with that name already exists.');
    }

    const permission = this.permissionsRepository.create({
      name: dto.name,
      description: dto.description,
    });

    return this.permissionsRepository.save(permission);
  }

  findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(id);

    if (dto.name && dto.name !== permission.name) {
      const existing = await this.permissionsRepository.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new BadRequestException('A permission with that name already exists.');
      }
      permission.name = dto.name;
    }

    if (dto.description !== undefined) {
      permission.description = dto.description;
    }

    return this.permissionsRepository.save(permission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
  }
}
