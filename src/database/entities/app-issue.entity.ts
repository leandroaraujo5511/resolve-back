import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Citizen } from './citizen.entity';
import { Company } from './company.entity';
import { City } from './city.entity';

@Entity('app_issues')
export class AppIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'uuid' })
  cityId: string;

  @ManyToOne(() => City, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Column({ type: 'uuid', nullable: true })
  citizenId: string | null;

  @ManyToOne(() => Citizen, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  citizenName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  citizenPhone: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  appVersion: string | null;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string | null;

  @Column({ type: 'jsonb', default: [] })
  attachments: string[];

  @CreateDateColumn()
  createdAt: Date;
}

