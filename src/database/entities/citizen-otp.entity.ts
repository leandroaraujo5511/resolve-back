import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('citizen_otps')
export class CitizenOtp {
  @PrimaryColumn({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
