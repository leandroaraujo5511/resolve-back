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
import { SubDepartment } from './sub-department.entity';

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

  /**
   * Escopo opcional dentro do departamento (SECRETARIA).
   * Quando preenchido, o usuário só vê tickets desse subdepartamento.
   */
  @Column({ type: 'uuid', nullable: true })
  subDepartmentId?: string | null;

  @ManyToOne(() => SubDepartment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subDepartmentId' })
  subDepartment?: SubDepartment | null;

  @Column({ type: 'varchar', length: 20, default: 'ativo' })
  status: 'ativo' | 'inativo';

  @Column({ length: 255 })
  passwordHash: string;

  /** Exige troca de senha antes de acessar o restante do painel. */
  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  welcomeEmailSentAt: Date | null;

  /**
   * Incrementado para invalidar refresh tokens emitidos anteriormente (R-11).
   * Incluído no payload do refresh JWT como `tv`.
   */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
