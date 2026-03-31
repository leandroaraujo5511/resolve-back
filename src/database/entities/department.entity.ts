import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { City } from './city.entity';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.departments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ length: 120 })
  name: string;

  /**
   * Nome do ícone Ionicons (variante outline), ex.: `construct-outline`.
   * Usado no app cidadão na listagem de categorias.
   */
  @Column({ type: 'varchar', length: 80, nullable: true })
  icon: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'ativo' })
  status: 'ativo' | 'inativo';

  /**
   * Se preenchido, só cidadãos cadastrados nessa cidade veem a categoria no app.
   * `null` = visível em todas as cidades do tenant.
   */
  @Column({ type: 'uuid', nullable: true })
  visibleOnlyInCityId?: string | null;

  @ManyToOne(() => City, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'visibleOnlyInCityId' })
  visibleOnlyInCity?: City | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.department)
  users: User[];
}
