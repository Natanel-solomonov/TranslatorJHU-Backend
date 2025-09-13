import { logger } from "../../utils/logger";

interface AudioProcessingConfig {
  noiseReduction: {
    enabled: boolean;
    threshold: number;
    strength: number;
  };
  voiceActivityDetection: {
    enabled: boolean;
    silenceThreshold: number;
    minSpeechDuration: number;
    maxSilenceDuration: number;
  };
  audioEnhancement: {
    enabled: boolean;
    gain: number;
    compression: boolean;
    equalization: boolean;
  };
  formatConversion: {
    targetSampleRate: number;
    targetChannels: number;
    targetBitDepth: number;
  };
}

interface VoiceActivityDetection {
  isSpeech: boolean;
  confidence: number;
  energy: number;
  duration: number;
}

interface AudioQualityMetrics {
  snr: number; // Signal-to-noise ratio
  clarity: number;
  loudness: number;
  distortion: number;
  overall: number;
}

export class AudioProcessingService {
  private config: AudioProcessingConfig;

  constructor() {
    this.config = {
      noiseReduction: {
        enabled: true,
        threshold: 0.01,
        strength: 0.8,
      },
      voiceActivityDetection: {
        enabled: true,
        silenceThreshold: 0.01,
        minSpeechDuration: 100, // ms
        maxSilenceDuration: 2000, // ms
      },
      audioEnhancement: {
        enabled: true,
        gain: 1.0,
        compression: true,
        equalization: true,
      },
      formatConversion: {
        targetSampleRate: 16000,
        targetChannels: 1,
        targetBitDepth: 16,
      },
    };
  }

  async processAudio(audioData: Buffer, originalFormat: any = {}): Promise<Buffer> {
    try {
      let processedData = audioData;

      // 1. Format conversion
      if (this.config.formatConversion) {
        processedData = await this.convertFormat(processedData, originalFormat);
      }

      // 2. Noise reduction
      if (this.config.noiseReduction.enabled) {
        processedData = await this.reduceNoise(processedData);
      }

      // 3. Audio enhancement
      if (this.config.audioEnhancement.enabled) {
        processedData = await this.enhanceAudio(processedData);
      }

      logger.debug("Audio processing completed", {
        originalSize: audioData.length,
        processedSize: processedData.length,
      });

      return processedData;
    } catch (error) {
      logger.error("Audio processing failed:", error);
      return audioData; // Return original if processing fails
    }
  }

  async detectVoiceActivity(audioData: Buffer): Promise<VoiceActivityDetection> {
    if (!this.config.voiceActivityDetection.enabled) {
      return {
        isSpeech: true,
        confidence: 1.0,
        energy: 1.0,
        duration: 0,
      };
    }

    try {
      // Convert buffer to float32 array for analysis
      const samples = this.bufferToFloat32Array(audioData);
      
      // Calculate energy (RMS)
      const energy = this.calculateRMS(samples);
      
      // Calculate spectral features
      const spectralCentroid = this.calculateSpectralCentroid(samples);
      const zeroCrossingRate = this.calculateZeroCrossingRate(samples);
      
      // Determine if speech based on energy and spectral features
      const isSpeech = energy > this.config.voiceActivityDetection.silenceThreshold &&
                      spectralCentroid > 0.1 &&
                      zeroCrossingRate < 0.3;
      
      // Calculate confidence based on multiple features
      const confidence = this.calculateVADConfidence(energy, spectralCentroid, zeroCrossingRate);
      
      return {
        isSpeech,
        confidence,
        energy,
        duration: samples.length / this.config.formatConversion.targetSampleRate * 1000,
      };
    } catch (error) {
      logger.error("Voice activity detection failed:", error);
      return {
        isSpeech: true,
        confidence: 0.5,
        energy: 0.5,
        duration: 0,
      };
    }
  }

  async analyzeAudioQuality(audioData: Buffer): Promise<AudioQualityMetrics> {
    try {
      const samples = this.bufferToFloat32Array(audioData);
      
      // Calculate SNR
      const snr = this.calculateSNR(samples);
      
      // Calculate clarity (spectral rolloff)
      const clarity = this.calculateClarity(samples);
      
      // Calculate loudness (RMS)
      const loudness = this.calculateRMS(samples);
      
      // Calculate distortion (THD)
      const distortion = this.calculateDistortion(samples);
      
      // Overall quality score
      const overall = this.calculateOverallQuality(snr, clarity, loudness, distortion);
      
      return {
        snr,
        clarity,
        loudness,
        distortion,
        overall,
      };
    } catch (error) {
      logger.error("Audio quality analysis failed:", error);
      return {
        snr: 0,
        clarity: 0,
        loudness: 0,
        distortion: 1,
        overall: 0,
      };
    }
  }

  async optimizeForRealTime(audioData: Buffer): Promise<Buffer> {
    try {
      // Apply real-time optimizations
      let optimized = audioData;
      
      // 1. Adaptive gain control
      optimized = await this.applyAdaptiveGainControl(optimized);
      
      // 2. Dynamic range compression
      if (this.config.audioEnhancement.compression) {
        optimized = await this.applyCompression(optimized);
      }
      
      // 3. Real-time noise suppression
      optimized = await this.applyRealTimeNoiseSuppression(optimized);
      
      return optimized;
    } catch (error) {
      logger.error("Real-time optimization failed:", error);
      return audioData;
    }
  }

  private async convertFormat(audioData: Buffer, originalFormat: any): Promise<Buffer> {
    // This would typically use a library like ffmpeg or Web Audio API
    // For now, we'll implement basic resampling logic
    
    const targetSampleRate = this.config.formatConversion.targetSampleRate;
    const targetChannels = this.config.formatConversion.targetChannels;
    
    // Simple resampling (in practice, you'd use a proper resampling library)
    const resampledData = await this.resampleAudio(audioData, targetSampleRate);
    
    return resampledData;
  }

  private async reduceNoise(audioData: Buffer): Promise<Buffer> {
    const samples = this.bufferToFloat32Array(audioData);
    const processedSamples = new Float32Array(samples.length);
    
    // Simple noise reduction using spectral subtraction
    const noiseProfile = this.estimateNoiseProfile(samples);
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0;
      const noiseLevel = noiseProfile[i % noiseProfile.length] || 0;
      
      if (Math.abs(sample) < noiseLevel * this.config.noiseReduction.strength) {
        processedSamples[i] = sample * 0.1; // Reduce noise
      } else {
        processedSamples[i] = sample;
      }
    }
    
    return this.float32ArrayToBuffer(processedSamples);
  }

  private async enhanceAudio(audioData: Buffer): Promise<Buffer> {
    const samples = this.bufferToFloat32Array(audioData);
    const enhancedSamples = new Float32Array(samples.length);
    
    // Apply gain
    const gain = this.config.audioEnhancement.gain;
    
    for (let i = 0; i < samples.length; i++) {
      enhancedSamples[i] = Math.max(-1, Math.min(1, (samples[i] || 0) * gain));
    }
    
    // Apply equalization if enabled
    if (this.config.audioEnhancement.equalization) {
      return this.float32ArrayToBuffer(await this.applyEqualization(enhancedSamples));
    }
    
    return this.float32ArrayToBuffer(enhancedSamples);
  }

  private bufferToFloat32Array(buffer: Buffer): Float32Array {
    const samples = new Float32Array(buffer.length / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = buffer.readInt16LE(i * 2) / 32768.0;
    }
    return samples;
  }

  private float32ArrayToBuffer(samples: Float32Array): Buffer {
    const buffer = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, (samples[i] || 0) * 32768)), i * 2);
    }
    return buffer;
  }

  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0;
      sum += sample * sample;
    }
    return Math.sqrt(sum / samples.length);
  }

  private calculateSpectralCentroid(samples: Float32Array): number {
    // Simplified spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const magnitude = Math.abs(samples[i] || 0);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum / samples.length : 0;
  }

  private calculateZeroCrossingRate(samples: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      const current = samples[i] || 0;
      const previous = samples[i - 1] || 0;
      if ((current >= 0) !== (previous >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  private calculateVADConfidence(energy: number, spectralCentroid: number, zeroCrossingRate: number): number {
    // Combine multiple features to calculate confidence
    const energyScore = Math.min(1, energy / this.config.voiceActivityDetection.silenceThreshold);
    const spectralScore = Math.min(1, spectralCentroid * 10);
    const zcrScore = Math.max(0, 1 - zeroCrossingRate * 2);
    
    return (energyScore + spectralScore + zcrScore) / 3;
  }

  private calculateSNR(samples: Float32Array): number {
    // Simplified SNR calculation
    const signal = this.calculateRMS(samples);
    const noise = this.estimateNoiseLevel(samples);
    return noise > 0 ? 20 * Math.log10(signal / noise) : 60; // Cap at 60dB
  }

  private calculateClarity(samples: Float32Array): number {
    // Spectral rolloff as clarity measure
    const sortedSamples = Array.from(samples).map(Math.abs).sort((a, b) => b - a);
    const threshold = 0.85;
    const thresholdIndex = Math.floor(sortedSamples.length * threshold);
    return sortedSamples[thresholdIndex] || 0;
  }

  private calculateDistortion(samples: Float32Array): number {
    // Simplified THD calculation
    let harmonicDistortion = 0;
    const fundamental = this.findFundamentalFrequency(samples);
    
    if (fundamental > 0) {
      // Look for harmonics
      for (let harmonic = 2; harmonic <= 5; harmonic++) {
        const harmonicFreq = fundamental * harmonic;
        const harmonicEnergy = this.getFrequencyEnergy(samples, harmonicFreq);
        harmonicDistortion += harmonicEnergy;
      }
    }
    
    return Math.min(1, harmonicDistortion);
  }

  private calculateOverallQuality(snr: number, clarity: number, loudness: number, distortion: number): number {
    // Normalize and weight different quality metrics
    const snrScore = Math.min(1, snr / 30); // Normalize to 0-1
    const clarityScore = Math.min(1, clarity * 2);
    const loudnessScore = Math.min(1, loudness * 2);
    const distortionScore = Math.max(0, 1 - distortion);
    
    return (snrScore * 0.3 + clarityScore * 0.3 + loudnessScore * 0.2 + distortionScore * 0.2);
  }

  private estimateNoiseProfile(samples: Float32Array): Float32Array {
    // Simple noise profile estimation (first 10% of samples)
    const noiseLength = Math.floor(samples.length * 0.1);
    const noiseProfile = new Float32Array(noiseLength);
    
    for (let i = 0; i < noiseLength; i++) {
      noiseProfile[i] = Math.abs(samples[i] || 0);
    }
    
    return noiseProfile;
  }

  private async resampleAudio(audioData: Buffer, targetSampleRate: number): Promise<Buffer> {
    // This is a simplified resampling implementation
    // In practice, you'd use a proper resampling library
    return audioData; // Placeholder
  }

  private async applyAdaptiveGainControl(audioData: Buffer): Promise<Buffer> {
    const samples = this.bufferToFloat32Array(audioData);
    const processedSamples = new Float32Array(samples.length);
    
    let gain = 1.0;
    const targetLevel = 0.1;
    const adaptationRate = 0.01;
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0;
      const currentLevel = Math.abs(sample);
      if (currentLevel > 0) {
        gain += (targetLevel - currentLevel) * adaptationRate;
        gain = Math.max(0.1, Math.min(10, gain)); // Clamp gain
      }
      processedSamples[i] = sample * gain;
    }
    
    return this.float32ArrayToBuffer(processedSamples);
  }

  private async applyCompression(audioData: Buffer): Promise<Buffer> {
    const samples = this.bufferToFloat32Array(audioData);
    const processedSamples = new Float32Array(samples.length);
    
    const threshold = 0.5;
    const ratio = 4.0;
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0;
      const absSample = Math.abs(sample);
      
      if (absSample > threshold) {
        const excess = absSample - threshold;
        const compressedExcess = excess / ratio;
        const compressedSample = threshold + compressedExcess;
        processedSamples[i] = Math.sign(sample) * compressedSample;
      } else {
        processedSamples[i] = sample;
      }
    }
    
    return this.float32ArrayToBuffer(processedSamples);
  }

  private async applyRealTimeNoiseSuppression(audioData: Buffer): Promise<Buffer> {
    // Real-time noise suppression using spectral gating
    return this.reduceNoise(audioData);
  }

  private async applyEqualization(samples: Float32Array): Promise<Float32Array> {
    // Simple high-pass filter for speech enhancement
    const filteredSamples = new Float32Array(samples.length);
    const alpha = 0.95; // High-pass filter coefficient
    
    filteredSamples[0] = samples[0] || 0;
    for (let i = 1; i < samples.length; i++) {
      const current = samples[i] || 0;
      const previous = samples[i - 1] || 0;
      const prevFiltered = filteredSamples[i - 1] || 0;
      filteredSamples[i] = alpha * (prevFiltered + current - previous);
    }
    
    return filteredSamples;
  }

  private estimateNoiseLevel(samples: Float32Array): number {
    // Estimate noise level from quietest 10% of samples
    const sortedSamples = Array.from(samples).map(Math.abs).sort((a, b) => a - b);
    const noiseIndex = Math.floor(sortedSamples.length * 0.1);
    return sortedSamples[noiseIndex] || 0.001;
  }

  private findFundamentalFrequency(samples: Float32Array): number {
    // Simplified fundamental frequency detection
    // In practice, you'd use autocorrelation or FFT-based methods
    return 0; // Placeholder
  }

  private getFrequencyEnergy(samples: Float32Array, frequency: number): number {
    // Simplified frequency energy calculation
    // In practice, you'd use FFT
    return 0; // Placeholder
  }

  updateConfig(newConfig: Partial<AudioProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("Audio processing configuration updated");
  }

  getConfig(): AudioProcessingConfig {
    return { ...this.config };
  }
}
