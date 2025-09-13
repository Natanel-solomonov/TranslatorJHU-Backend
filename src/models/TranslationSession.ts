import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
// Note: Importing User would cause circular dependencies

@Entity("translation_sessions")
export class TranslationSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @Column()
  sourceLanguage!: string;

  @Column()
  targetLanguage!: string;

  @Column({ nullable: true })
  meetingPlatform?: string; // 'zoom', 'meet', 'teams'

  @Column({ nullable: true })
  meetingId?: string;

  @Column({ default: "active" })
  status!: string; // 'active', 'paused', 'completed', 'failed'

  @Column("jsonb", { nullable: true })
  sessionMetadata?: {
    totalDuration: number;
    wordsTranslated: number;
    averageLatency: number;
    qualityScore: number;
  };

  @Column("jsonb", { nullable: true })
  audioSettings?: {
    sampleRate: number;
    channels: number;
    chunkSize: number;
    voiceActivityDetection: boolean;
  };

  @CreateDateColumn()
  startedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  endedAt?: Date;

  // Relationships
  @ManyToOne("User", (user: any) => user.translationSessions)
  @JoinColumn()
  user!: any;
}
