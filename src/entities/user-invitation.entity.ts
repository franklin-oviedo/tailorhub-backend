import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Role } from '../common/enums/role.enum';
import { InvitationStatus } from '../common/enums/invitation-status.enum';

@Entity('user_invitations')
export class UserInvitation {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'token', type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'role', type: 'enum', enum: Role })
  role: Role;

  @Column({
    name: 'status',
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @ManyToOne(() => Store, { nullable: false })
  store: Store;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId: string;

  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
