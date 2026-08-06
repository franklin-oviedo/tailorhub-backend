import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the permission' })
  id: string;

  @Column({ name: 'name', unique: true, length: 120, comment: 'Name of the permission' })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true, comment: 'Description of the permission' })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the permission' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the permission' })
  updatedAt: Date;

  @ManyToMany(() => Plan, (plan) => plan.permissions)
  plans: Plan[];
}
