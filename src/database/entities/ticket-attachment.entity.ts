import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';
import { Citizen } from './citizen.entity';

export type TicketAttachmentStatus = 'ativo' | 'removido';

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'text' })
  storageKey: string;

  @Column({ length: 240 })
  originalFileName: string;

  @Column({ length: 120 })
  contentType: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: string;

  @Column({ type: 'uuid', nullable: true })
  uploadedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedByUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedByCitizenId: string | null;

  @ManyToOne(() => Citizen, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedByCitizenId' })
  uploadedByCitizen: Citizen | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'ativo' })
  status: TicketAttachmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  removedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  removalReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
