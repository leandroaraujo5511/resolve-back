import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Município no catálogo compartilhado (não pertence a um tenant). */
@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 2 })
  stateUf: string;

  @Column({ type: 'varchar', length: 20, default: 'ativo' })
  status: 'ativo' | 'inativo';

  @CreateDateColumn()
  createdAt: Date;
}
