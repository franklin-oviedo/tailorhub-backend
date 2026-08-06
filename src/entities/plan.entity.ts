import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';
import { Store } from './store.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the plan' })
  id: string;

  @Column({ name: 'name', unique: true, length: 120, comment: 'Name of the plan' })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true, comment: 'Description of the plan' })
  description: string;

  @Column({ name: 'enabled_modules', type: 'text', array: true, default: [], comment: 'Enabled modules for the plan' })
  enabledModules: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the plan' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the plan' })
  updatedAt: Date;

  @ManyToMany(() => Permission, (permission) => permission.plans, {
    cascade: false,
    eager: true,
  })
  @JoinTable({
    name: 'plan_permissions',
    joinColumn: { name: 'plan_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @OneToMany(() => Store, (store) => store.plan)
  stores!: Store[];
}
