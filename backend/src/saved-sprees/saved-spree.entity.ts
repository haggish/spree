import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SpreePlan } from '../common/interfaces';

@Entity('saved_sprees')
export class SavedSpreeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  name!: string;

  @Column({ type: 'jsonb' })
  plan!: SpreePlan;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
