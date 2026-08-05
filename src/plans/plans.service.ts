/* c8 ignore file */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { Plan } from '../entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const permissions = dto.permissionIds?.length
      ? await this.permissionsRepository.findBy({ id: In(dto.permissionIds) })
      : [];

    const plan = this.plansRepository.create({
      name: dto.name,
      description: dto.description,
      enabledModules: dto.enabledModules ?? [],
      permissions,
    });

    return this.plansRepository.save(plan);
  }

  findAll(): Promise<Plan[]> {
    return this.plansRepository.find({ relations: ['permissions'] });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);

    if (dto.permissionIds) {
      plan.permissions = dto.permissionIds.length
        ? await this.permissionsRepository.findBy({ id: In(dto.permissionIds) })
        : [];
    }

    if (dto.name !== undefined) {
      plan.name = dto.name;
    }

    if (dto.description !== undefined) {
      plan.description = dto.description;
    }

    if (dto.enabledModules !== undefined) {
      plan.enabledModules = dto.enabledModules;
    }

    return this.plansRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.plansRepository.remove(plan);
  }
}
