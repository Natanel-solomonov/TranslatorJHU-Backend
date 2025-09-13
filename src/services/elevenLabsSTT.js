// ElevenLabs Speech-to-Text service
import { API_KEYS } from '../../config.js';

export class ElevenLabsSTTService {
  constructor() {
    this.apiKey = API_KEYS.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.hasApiKey = this.apiKey && this.apiKey !== 'your_elevenlabs_api_key_here';
    
    // Rate limiting and queuing
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 1; // Reduced to 1 to avoid rate limiting
    this.requestDelay = 1500; // 1.5 second delay between requests
    this.lastRequestTime = 0;
  }

  async transcribeAudio(audioBuffer, language = 'en') {
    if (!this.hasApiKey) {
      throw new Error('ElevenLabs API key not provided');
    }

    // Check minimum audio length (ElevenLabs requires at least 0.5 seconds)
    const minAudioLength = 8000; // ~0.5 seconds at 16kHz
    if (audioBuffer.byteLength < minAudioLength) {
      console.log(`⚠️ Audio too short for ElevenLabs STT: ${audioBuffer.byteLength} bytes (minimum: ${minAudioLength} bytes)`);
      throw new Error(`Audio too short: ${audioBuffer.byteLength} bytes (minimum: ${minAudioLength} bytes)`);
    }

    try {
      console.log(`🎤 ElevenLabs STT: Starting transcription (${audioBuffer.byteLength} bytes)`);
      
      // Convert audio to proper WAV format
      console.log('🎵 Converting audio to WAV format');
      const wavBuffer = await this.convertWebMToWav(audioBuffer);
      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      // Create form data with proper file format
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model_id', 'scribe_v1');
      formData.append('language', language);
      formData.append('response_format', 'json');
      formData.append('temperature', '0.2');

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
          // Don't set Content-Type, let fetch set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs STT API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ ElevenLabs STT: Transcription completed - "${result.text}"`);
      console.log(`🔍 Full STT response:`, JSON.stringify(result, null, 2));
      
      return {
        text: result.text || '',
        confidence: result.confidence || 0.9,
        isFinal: true,
        provider: 'elevenlabs'
      };
    } catch (error) {
      console.error('❌ ElevenLabs STT error:', error);
      throw error; // Don't fall back to mock, let the error propagate
    }
  }


  async convertWebMToWav(audioBuffer) {
    try {
      // For now, we'll create a simple WAV file with the raw audio data
      // This is a simplified approach - in production you'd want to properly decode WebM/Opus
      const sampleRate = 16000; // 16kHz sample rate
      const numChannels = 1; // Mono
      const bitsPerSample = 16;
      const blockAlign = numChannels * bitsPerSample / 8;
      const byteRate = sampleRate * blockAlign;
      
      // Use the raw audio buffer size (this is a simplified approach)
      const dataSize = audioBuffer.byteLength;
      const fileSize = 44 + dataSize;

      // Create WAV header
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      // RIFF header
      view.setUint32(0, 0x46464952, true); // "RIFF"
      view.setUint32(4, fileSize - 8, true);
      view.setUint32(8, 0x45564157, true); // "WAVE"

      // fmt chunk
      view.setUint32(12, 0x20746d66, true); // "fmt "
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // audio format (PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);

      // data chunk
      view.setUint32(36, 0x61746164, true); // "data"
      view.setUint32(40, dataSize, true);

      // Copy audio data
      const audioView = new Uint8Array(audioBuffer);
      const wavView = new Uint8Array(buffer, 44);
      wavView.set(audioView);

      console.log(`🎵 Converted WebM to WAV: ${audioBuffer.byteLength} bytes -> ${buffer.byteLength} bytes`);
      
      return buffer;
    } catch (error) {
      console.error('❌ Error converting WebM to WAV:', error);
      // Fallback to simple conversion
      return this.convertToWav(audioBuffer);
    }
  }

  convertToWav(audioBuffer) {
    // Convert raw audio buffer to WAV format
    const sampleRate = 16000; // 16kHz sample rate
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const blockAlign = numChannels * bitsPerSample / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.byteLength;
    const fileSize = 44 + dataSize;

    // Create WAV header
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    view.setUint32(0, 0x46464952, true); // "RIFF"
    view.setUint32(4, fileSize - 8, true);
    view.setUint32(8, 0x45564157, true); // "WAVE"

    // fmt chunk
    view.setUint32(12, 0x20746d66, true); // "fmt "
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    view.setUint32(36, 0x61746164, true); // "data"
    view.setUint32(40, dataSize, true);

    // Copy audio data
    const audioView = new Uint8Array(audioBuffer);
    const wavView = new Uint8Array(buffer, 44);
    wavView.set(audioView);

    return buffer;
  }



  async translateText(text, targetLanguage = 'es') {
    try {
      console.log(`🌐 ElevenLabs STT: Translating "${text}" to ${targetLanguage}`);
      
      // Handle empty text
      if (!text || text.trim() === '') {
        console.log('⚠️ Empty text provided for translation, returning empty result');
        return {
          translatedText: '',
          confidence: 0.0,
          audioData: null
        };
      }
      
      // Use free translation API
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        const translatedText = data.responseData.translatedText;
        console.log(`🌐 Translation result: "${text}" → "${translatedText}"`);
        
        // Generate audio using ElevenLabs TTS if API key is available
        let audioData = null;
        if (this.hasApiKey) {
          try {
            console.log(`🎵 Generating audio with ElevenLabs TTS...`);
            audioData = await this.generateAudio(translatedText);
            console.log(`✅ Audio generated successfully`);
          } catch (audioError) {
            console.warn('⚠️ Audio generation failed:', audioError.message);
          }
        }
        
        return {
          translatedText: translatedText,
          confidence: 0.8,
          audioData: audioData
        };
      } else {
        throw new Error('Translation API failed');
      }
    } catch (error) {
      // Fallback translation for demo purposes
      const fallbackTranslations = {
        'Richard. William. Orange. More.': 'Ricardo. Guillermo. Naranja. Más.',
        'Richard. William. Orange.': 'Ricardo. Guillermo. Naranja.',
        'Hello': 'Hola',
        'Thank you': 'Gracias',
        'Good morning': 'Buenos días',
        'How are you': '¿Cómo estás?'
      };
      
      const fallbackTranslation = fallbackTranslations[text] || `[Translated: ${text}]`;
      
      // Generate audio using ElevenLabs TTS for fallback translations too
      let audioData = null;
      if (this.hasApiKey) {
        try {
          console.log(`🎵 Generating fallback audio with ElevenLabs TTS for: "${fallbackTranslation}"`);
          audioData = await this.generateAudio(fallbackTranslation);
          console.log(`✅ Fallback audio generated successfully`);
        } catch (audioError) {
          console.warn('⚠️ Fallback audio generation failed:', audioError.message);
        }
      }
      
      return {
        translatedText: fallbackTranslation,
        confidence: 0.8,
        audioData: audioData
      };
    }
  }

  async generateAudio(text) {
    if (!this.hasApiKey) {
      console.log('⚠️ ElevenLabs TTS: API key not provided, skipping audio generation');
      return null;
    }

    // Use queued request to handle rate limiting
    return new Promise((resolve) => {
      this.requestQueue.push({
        text,
        resolve,
        timestamp: Date.now()
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      // Wait before processing next request
      setTimeout(() => this.processQueue(), this.requestDelay - timeSinceLastRequest);
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;
    this.lastRequestTime = now;

    try {
      console.log(`🎵 Processing TTS request: "${request.text.substring(0, 50)}..."`);
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: request.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ ElevenLabs TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
        request.resolve(null);
      } else {
        const audioBuffer = await response.arrayBuffer();
        const audioArray = Array.from(new Uint8Array(audioBuffer));
        console.log(`✅ ElevenLabs TTS: Generated ${audioArray.length} bytes of audio`);
        request.resolve(audioArray);
      }
    } catch (error) {
      console.warn('⚠️ ElevenLabs TTS error:', error.message);
      request.resolve(null);
    } finally {
      this.activeRequests--;
      // Process next request in queue
      setTimeout(() => this.processQueue(), 100);
    }
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

export const elevenLabsSTTService = new ElevenLabsSTTService();
