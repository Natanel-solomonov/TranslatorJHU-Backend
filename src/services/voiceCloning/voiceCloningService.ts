import axios from "axios";
import { logger } from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";

export interface VoiceAnalysis {
  voiceId: string;
  characteristics: {
    gender: "male" | "female" | "neutral";
    age: "young" | "middle" | "mature";
    accent: string;
    speakingRate: number;
    pitch: number;
    energy: number;
    clarity: number;
  };
  quality: {
    overall: number;
    naturalness: number;
    intelligibility: number;
    consistency: number;
  };
  metadata: {
    duration: number;
    sampleRate: number;
    language: string;
    createdAt: Date;
  };
}

interface VoiceClone {
  voiceId: string;
  name: string;
  description: string;
  language: string;
  gender: string;
  age: string;
  accent: string;
  quality: number;
  isActive: boolean;
  createdAt: Date;
}

interface VoiceSimilarityResult {
  voiceId1: string;
  voiceId2: string;
  similarity: number;
  characteristics: {
    gender: boolean;
    age: boolean;
    accent: boolean;
    pitch: number;
    energy: number;
  };
}

export class VoiceCloningService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";
  private clonedVoices = new Map<string, VoiceClone>();
  private voiceAnalyses = new Map<string, VoiceAnalysis>();

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("ElevenLabs API key not found, voice cloning disabled");
    }
  }

  async analyzeVoice(audioData: Buffer, language: string = "en"): Promise<VoiceAnalysis | null> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const voiceId = uuidv4();
      
      // Upload audio for analysis
      const formData = new FormData();
      formData.append("audio", new Blob([audioData as any], { type: "audio/wav" }), "voice_sample.wav");
      formData.append("language", language);

      const response = await axios.post(
        `${this.baseUrl}/voices/${voiceId}/analyze`,
        formData,
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const analysis: VoiceAnalysis = {
        voiceId,
        characteristics: {
          gender: this.detectGender(response.data),
          age: this.detectAge(response.data),
          accent: response.data.accent || "neutral",
          speakingRate: response.data.speaking_rate || 1.0,
          pitch: response.data.pitch || 0.0,
          energy: response.data.energy || 0.5,
          clarity: response.data.clarity || 0.8,
        },
        quality: {
          overall: response.data.quality?.overall || 0.8,
          naturalness: response.data.quality?.naturalness || 0.8,
          intelligibility: response.data.quality?.intelligibility || 0.8,
          consistency: response.data.quality?.consistency || 0.8,
        },
        metadata: {
          duration: response.data.duration || 0,
          sampleRate: response.data.sample_rate || 22050,
          language,
          createdAt: new Date(),
        },
      };

      this.voiceAnalyses.set(voiceId, analysis);
      logger.info(`Voice analysis completed for voice ${voiceId}`);

      return analysis;
    } catch (error) {
      logger.error("Voice analysis failed:", error);
      return null;
    }
  }

  async cloneVoice(
    audioData: Buffer,
    name: string,
    description: string,
    language: string = "en"
  ): Promise<VoiceClone | null> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      // First analyze the voice
      const analysis = await this.analyzeVoice(audioData, language);
      if (!analysis) {
        throw new Error("Voice analysis failed");
      }

      // Create voice clone
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("files", new Blob([audioData as any], { type: "audio/wav" }), "voice_sample.wav");
      formData.append("labels", JSON.stringify({
        language,
        gender: analysis.characteristics.gender,
        age: analysis.characteristics.age,
        accent: analysis.characteristics.accent,
      }));

      const response = await axios.post(
        `${this.baseUrl}/voices/add`,
        formData,
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const voiceClone: VoiceClone = {
        voiceId: response.data.voice_id,
        name,
        description,
        language,
        gender: analysis.characteristics.gender,
        age: analysis.characteristics.age,
        accent: analysis.characteristics.accent,
        quality: analysis.quality.overall,
        isActive: true,
        createdAt: new Date(),
      };

      this.clonedVoices.set(voiceClone.voiceId, voiceClone);
      logger.info(`Voice cloned successfully: ${voiceClone.voiceId}`);

      return voiceClone;
    } catch (error) {
      logger.error("Voice cloning failed:", error);
      return null;
    }
  }

  async synthesizeWithClone(
    text: string,
    voiceId: string,
    settings?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<ArrayBuffer | null> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const voice = this.clonedVoices.get(voiceId);
      if (!voice || !voice.isActive) {
        throw new Error(`Voice ${voiceId} not found or inactive`);
      }

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: settings?.stability || 0.5,
            similarity_boost: settings?.similarityBoost || 0.75,
            style: settings?.style || 0.0,
            use_speaker_boost: settings?.useSpeakerBoost || true,
          },
        },
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          responseType: "arraybuffer",
        }
      );

      logger.debug(`Voice synthesis completed with clone ${voiceId}`);
      return response.data;
    } catch (error) {
      logger.error(`Voice synthesis with clone ${voiceId} failed:`, error);
      return null;
    }
  }

  async compareVoices(voiceId1: string, voiceId2: string): Promise<VoiceSimilarityResult | null> {
    const analysis1 = this.voiceAnalyses.get(voiceId1);
    const analysis2 = this.voiceAnalyses.get(voiceId2);

    if (!analysis1 || !analysis2) {
      return null;
    }

    const characteristics = analysis1.characteristics;
    const characteristics2 = analysis2.characteristics;

    // Calculate similarity scores
    const genderMatch = characteristics.gender === characteristics2.gender ? 1 : 0;
    const ageMatch = characteristics.age === characteristics2.age ? 1 : 0;
    const accentMatch = characteristics.accent === characteristics2.accent ? 1 : 0;
    
    const pitchDiff = Math.abs(characteristics.pitch - characteristics2.pitch);
    const energyDiff = Math.abs(characteristics.energy - characteristics2.energy);
    
    const pitchSimilarity = Math.max(0, 1 - pitchDiff);
    const energySimilarity = Math.max(0, 1 - energyDiff);

    const overallSimilarity = (
      genderMatch * 0.3 +
      ageMatch * 0.2 +
      accentMatch * 0.2 +
      pitchSimilarity * 0.15 +
      energySimilarity * 0.15
    );

    return {
      voiceId1,
      voiceId2,
      similarity: overallSimilarity,
      characteristics: {
        gender: genderMatch === 1,
        age: ageMatch === 1,
        accent: accentMatch === 1,
        pitch: pitchSimilarity,
        energy: energySimilarity,
      },
    };
  }

  async findSimilarVoices(targetVoiceId: string, threshold: number = 0.7): Promise<VoiceSimilarityResult[]> {
    const similarities: VoiceSimilarityResult[] = [];

    for (const [voiceId, _] of this.voiceAnalyses) {
      if (voiceId !== targetVoiceId) {
        const similarity = await this.compareVoices(targetVoiceId, voiceId);
        if (similarity && similarity.similarity >= threshold) {
          similarities.push(similarity);
        }
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  async updateVoiceSettings(
    voiceId: string,
    settings: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      await axios.post(
        `${this.baseUrl}/voices/${voiceId}/settings`,
        settings,
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      logger.info(`Voice settings updated for ${voiceId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update voice settings for ${voiceId}:`, error);
      return false;
    }
  }

  async deleteVoice(voiceId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      await axios.delete(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      this.clonedVoices.delete(voiceId);
      this.voiceAnalyses.delete(voiceId);
      logger.info(`Voice ${voiceId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete voice ${voiceId}:`, error);
      return false;
    }
  }

  getClonedVoices(): VoiceClone[] {
    return Array.from(this.clonedVoices.values());
  }

  getVoiceAnalysis(voiceId: string): VoiceAnalysis | null {
    return this.voiceAnalyses.get(voiceId) || null;
  }

  private detectGender(data: any): "male" | "female" | "neutral" {
    // This would typically use ML models or API analysis
    // For now, we'll use a simple heuristic based on pitch
    const pitch = data.pitch || 0;
    if (pitch > 0.1) return "female";
    if (pitch < -0.1) return "male";
    return "neutral";
  }

  private detectAge(data: any): "young" | "middle" | "mature" {
    // This would typically use ML models or API analysis
    // For now, we'll use a simple heuristic based on speaking rate and energy
    const speakingRate = data.speaking_rate || 1.0;
    const energy = data.energy || 0.5;
    
    if (speakingRate > 1.2 && energy > 0.6) return "young";
    if (speakingRate < 0.8 && energy < 0.4) return "mature";
    return "middle";
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });
      return response.status === 200;
    } catch (error) {
      logger.error("Voice cloning service health check failed:", error);
      return false;
    }
  }
}
