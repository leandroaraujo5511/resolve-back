import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Department } from './department.entity';

export enum UserRole {
  /** Gestão global da plataforma (vários tenants). */
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SECRETARIA = 'SECRETARIA',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Ausente para `SUPER_ADMIN` (sem tenant fixo). */
  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, (company) => company.users, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SECRETARIA })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, (department) => department.users, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @Column({ type: 'varchar', length: 20, default: 'ativo' })
  status: 'ativo' | 'inativo';

  @Column({ length: 255 })
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
