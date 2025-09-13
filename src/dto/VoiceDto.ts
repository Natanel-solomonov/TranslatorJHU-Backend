import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from "class-validator";

export class VoiceSampleUploadDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sampleType?: string; // 'onboarding', 'calibration', 'training'
}

export class VoiceAnalysisDto {
  @IsArray()
  sampleIds!: string[];

  @IsOptional()
  @IsBoolean()
  createClone?: boolean;
}

export class VoiceSynthesisDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  pitch?: number;

  @IsOptional()
  @IsString()
  emotion?: string; // 'neutral', 'happy', 'sad', 'excited', 'calm'
}

export class VoiceCloneDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  sampleIds!: string[];

  @IsOptional()
  @IsString()
  targetLanguage?: string;
}
