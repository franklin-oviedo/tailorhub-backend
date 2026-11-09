import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Role } from '../common/enums/role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { Customers } from './customer.entity';
import { Employee } from './employee.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the user' })
  id: string;

  @Column({ name: 'password', length: 255,  nullable: false, comment: 'Password of the user' })
  password: string;

  @Column({ name: 'role', type: 'enum', enum: Role, default: Role.CLIENT, comment: 'Role of the user' })
  role: Role;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    nullable: false,
    comment: 'Authentication provider used for the user account',
  })
  authProvider: AuthProvider;

  @Column({
    name: 'google_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: 'Google account identifier when the user signs in with Google',
  })
  googleId: string | null;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 1024,
    nullable: true,
    comment: 'Profile avatar URL from an external identity provider',
  })
  avatarUrl: string | null;

  @Column({
    name: 'google_refresh_token',
    type: 'text',
    nullable: true,
    comment: 'Google OAuth refresh token used to access Google Calendar on behalf of the user',
  })
  googleRefreshToken: string | null;

  @Column({
    name: 'google_calendar_email',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Google account email linked for calendar synchronization',
  })
  googleCalendarEmail: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false, comment: 'Indicates if the user is active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the user' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the user' })
  updatedAt: Date;

  @OneToOne(() => Customers, (customer) => customer.user, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customers;

  @ManyToOne(() => Store, (store) => store.users)
  store: Store;

  @OneToOne(() => Employee, (employee) => employee.user, { nullable: true, cascade: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
