import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
// Note: Importing User and VoiceSample would cause circular dependencies

@Entity("voice_profiles")
export class VoiceProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @Column({ nullable: true })
  elevenLabsVoiceId?: string;

  @Column("jsonb", { nullable: true })
  voiceCharacteristics?: {
    pitch: number;
    tone: string;
    accent: string;
    speed: number;
    emotion: string;
  };

  @Column("jsonb", { nullable: true })
  audioFeatures?: {
    mfcc: number[];
    spectralCentroid: number;
    spectralRolloff: number;
    zeroCrossingRate: number;
  };

  @Column({ default: false })
  isProcessed!: boolean;

  @Column({ default: false })
  isCloned!: boolean;

  @Column({ nullable: true })
  cloneQuality?: number; // 0-1 score

  @Column({ nullable: true })
  processingStatus?: string; // 'pending', 'processing', 'completed', 'failed'

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToOne("User", (user: any) => user.voiceProfile)
  @JoinColumn()
  user!: any;

  @OneToMany("VoiceSample", (sample: any) => sample.voiceProfile)
  voiceSamples?: any[];
}
