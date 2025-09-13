import { IsString, IsOptional, IsObject, IsBoolean } from "class-validator";

export class CreateSessionDto {
  @IsString()
  sourceLanguage!: string;

  @IsString()
  targetLanguage!: string;

  @IsOptional()
  @IsString()
  meetingPlatform?: string; // 'zoom', 'meet', 'teams'

  @IsOptional()
  @IsString()
  meetingId?: string;

  @IsOptional()
  @IsObject()
  audioSettings?: {
    sampleRate?: number;
    channels?: number;
    chunkSize?: number;
    voiceActivityDetection?: boolean;
  };
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  sourceLanguage?: string;

  @IsOptional()
  @IsString()
  targetLanguage?: string;

  @IsOptional()
  @IsString()
  status?: string; // 'active', 'paused', 'completed', 'failed'

  @IsOptional()
  @IsObject()
  sessionMetadata?: {
    totalDuration?: number;
    wordsTranslated?: number;
    averageLatency?: number;
    qualityScore?: number;
  };

  @IsOptional()
  @IsObject()
  audioSettings?: {
    sampleRate?: number;
    channels?: number;
    chunkSize?: number;
    voiceActivityDetection?: boolean;
  };
}
