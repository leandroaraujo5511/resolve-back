import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Log de tentativas de forgot-password (inclusive e-mails inexistentes)
 * para rate limit sem enumeração de usuários.
 */
@Entity('password_reset_request_logs')
export class PasswordResetRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 150 })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  requestIp: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
