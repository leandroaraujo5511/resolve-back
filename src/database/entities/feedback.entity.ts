import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Citizen } from './citizen.entity';
import { City } from './city.entity';
import { Company } from './company.entity';
import { FeedbackType } from './feedback.enums';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  /** Escopo municipal: sempre a cidade do cidadão que enviou. */
  @Column({ type: 'uuid' })
  cityId: string;

  @ManyToOne(() => City, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Column({ type: 'uuid' })
  citizenId: string;

  @ManyToOne(() => Citizen, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen;

  @Column({ length: 120 })
  citizenName: string;

  @Column({ type: 'enum', enum: FeedbackType })
  type: FeedbackType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  attachments: string[];

  @CreateDateColumn()
  createdAt: Date;
}
