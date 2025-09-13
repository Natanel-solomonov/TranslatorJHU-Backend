import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
// Note: Importing VoiceProfile would cause circular dependencies

@Entity("voice_samples")
export class VoiceSample {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  voiceProfileId!: string;

  @Column()
  filename!: string;

  @Column()
  originalFilename!: string;

  @Column()
  filePath!: string;

  @Column()
  mimeType!: string;

  @Column("bigint")
  fileSize!: number;

  @Column("decimal", { precision: 5, scale: 2 })
  duration!: number; // Duration in seconds

  @Column("jsonb", { nullable: true })
  audioMetadata?: {
    sampleRate: number;
    channels: number;
    bitRate: number;
    format: string;
  };

  @Column("jsonb", { nullable: true })
  qualityMetrics?: {
    signalToNoiseRatio: number;
    clarity: number;
    backgroundNoise: number;
    voiceActivity: number;
  };

  @Column({ default: false })
  isProcessed!: boolean;

  @Column({ default: false })
  isValid!: boolean;

  @Column({ nullable: true })
  transcription?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne("VoiceProfile", (profile: any) => profile.voiceSamples)
  @JoinColumn()
  voiceProfile!: any;
}
