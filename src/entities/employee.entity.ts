import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne } from 'typeorm';
import { Store } from './store.entity';
import { User } from './user.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the employee' })
  id: string;

  @Column({name: 'name', type: 'varchar', length: 255, nullable: false, comment: 'Full name of the employee'})
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Store, store => store.employees)
  store: Store;

  @OneToOne(() => User, user => user.employee)
  user: User;
}
