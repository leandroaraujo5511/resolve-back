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
import { Citizen } from './citizen.entity';
import { City } from './city.entity';
import { Company } from './company.entity';
import { Department } from './department.entity';
import { Neighborhood } from './neighborhood.entity';
import { TicketHistory } from './ticket-history.entity';
import { TicketPriority, TicketStatus } from './ticket.enums';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  /** Município do chamado (obrigatório para novos; legado pode ser null até migrar). */
  @Column({ type: 'uuid', nullable: true })
  cityId: string | null;

  @ManyToOne(() => City, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'cityId' })
  city: City | null;

  /** Cidadão que abriu (app); tickets só do painel podem ficar null. */
  @Column({ type: 'uuid', nullable: true })
  citizenId: string | null;

  @ManyToOne(() => Citizen, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen | null;

  @Column({ length: 32 })
  protocol: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  shortDescription: string;

  @Column({ type: 'text' })
  detailedDescription: string;

  @Column({ type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.ABERTO })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIA })
  priority: TicketPriority;

  @Column({ length: 120 })
  citizenName: string;

  @Column({ length: 30 })
  citizenPhone: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'uuid', nullable: true })
  neighborhoodId: string | null;

  @ManyToOne(() => Neighborhood, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'neighborhoodId' })
  neighborhood: Neighborhood | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  addressLine: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressComplement: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'jsonb', default: [] })
  attachments: string[];

  @OneToMany(() => TicketHistory, (h) => h.ticket, { cascade: true })
  history: TicketHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
