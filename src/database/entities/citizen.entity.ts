import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { City } from './city.entity';
import { Company } from './company.entity';

@Entity('citizens')
export class Citizen {
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

  /** Apenas dígitos (ex.: 11987654321). Único global no MVP. */
  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 120 })
  name: string;

  /** Key no storage (R2) da foto de perfil; URL assinada via presign-get no app. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarKey: string | null;

  @Column({ length: 255 })
  passwordHash: string;

  /** Token Expo Push (app cidadão); um dispositivo por conta no MVP. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  expoPushToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
