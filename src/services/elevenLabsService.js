// ElevenLabs API service for voice synthesis
import { API_KEYS } from '../../config.js';

export class ElevenLabsService {
  constructor() {
    this.apiKey = API_KEYS.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.hasApiKey = this.apiKey && this.apiKey !== 'your_elevenlabs_api_key_here';
  }

  async synthesizeSpeech(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    if (!this.hasApiKey) {
      console.warn('⚠️ ElevenLabs API key not provided, using mock synthesis');
      return this.getMockSynthesis(text);
    }

    try {
      console.log(`🎤 ElevenLabs: Synthesizing "${text}" with voice ${voiceId}`);
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`✅ ElevenLabs: Generated ${audioBuffer.byteLength} bytes of audio`);
      
      return {
        audioBuffer: audioBuffer,
        format: 'mp3',
        duration: audioBuffer.byteLength / 16000, // Rough estimate
        provider: 'elevenlabs'
      };
    } catch (error) {
      console.error('❌ ElevenLabs synthesis error:', error);
      console.log('🔄 Falling back to mock synthesis');
      return this.getMockSynthesis(text);
    }
  }

  async getVoices() {
    if (!this.hasApiKey) {
      return this.getMockVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        language: voice.labels?.language || 'en'
      }));
    } catch (error) {
      console.error('❌ Failed to get ElevenLabs voices:', error);
      return this.getMockVoices();
    }
  }

  getMockSynthesis(text) {
    console.log(`🎤 Mock synthesis: "${text}"`);
    return {
      audioBuffer: new ArrayBuffer(1000), // Mock audio data
      format: 'mp3',
      duration: text.length * 0.1, // Rough estimate
      provider: 'mock'
    };
  }

  getMockVoices() {
    return [
      {
        id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        category: 'premade',
        description: 'American female voice',
        language: 'en'
      },
      {
        id: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi',
        category: 'premade',
        description: 'American female voice',
        language: 'en'
      },
      {
        id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        category: 'premade',
        description: 'American female voice',
        language: 'en'
      }
    ];
  }

  async getUsage() {
    if (!this.hasApiKey) {
      return { characters_used: 0, characters_limit: 10000 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        characters_used: data.subscription?.character_count || 0,
        characters_limit: data.subscription?.character_limit || 10000
      };
    } catch (error) {
      console.error('❌ Failed to get ElevenLabs usage:', error);
      return { characters_used: 0, characters_limit: 10000 };
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
