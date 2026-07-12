import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Citizen } from './citizen.entity';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';
import { TicketStatus } from './ticket.enums';

export type TicketHistoryActorType =
  | 'USER'
  | 'CITIZEN'
  | 'SYSTEM'
  | 'INTEGRATION';

@Entity('ticket_history')
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'enum', enum: TicketStatus })
  status: TicketStatus;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  /** Preenchido em ações do painel (gestor/secretaria). */
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  /** Preenchido quando o cidadão abre o chamado ou comenta via app. */
  @Column({ type: 'uuid', nullable: true })
  citizenId: string | null;

  @ManyToOne(() => Citizen, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen | null;

  @Column({ type: 'boolean', default: false })
  isInternal: boolean;

  /** USER | CITIZEN | SYSTEM | INTEGRATION — snapshot no momento da ação (RN-091). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  actorType: TicketHistoryActorType | null;

  /** Nome exibido no histórico (snapshot; não muda se o usuário for renomeado). */
  @Column({ type: 'varchar', length: 160, nullable: true })
  actorDisplayName: string | null;
}
