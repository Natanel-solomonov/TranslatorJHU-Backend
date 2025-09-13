// AssemblyAI service for speech-to-text
import { API_KEYS } from '../../config.js';

export class AssemblyAIService {
  constructor() {
    this.apiKey = API_KEYS.ASSEMBLYAI_API_KEY;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    this.hasApiKey = this.apiKey && this.apiKey !== 'your_assemblyai_api_key_here';
  }

  async transcribeAudio(audioBuffer, language = 'en_us') {
    if (!this.hasApiKey) {
      console.warn('⚠️ AssemblyAI API key not provided, using mock transcription');
      return this.getMockTranscription(audioBuffer);
    }

    try {
      console.log(`🎤 AssemblyAI: Starting transcription (${audioBuffer.byteLength} bytes)`);
      
      // Upload audio file
      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey
        },
        body: audioBuffer
      });

      if (!uploadResponse.ok) {
        throw new Error(`AssemblyAI upload error: ${uploadResponse.status}`);
      }

      const { upload_url } = await uploadResponse.json();
      console.log('📤 Audio uploaded to AssemblyAI');

      // Start transcription
      const transcriptResponse = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: language,
          punctuate: true,
          format_text: true
        })
      });

      if (!transcriptResponse.ok) {
        throw new Error(`AssemblyAI transcription error: ${transcriptResponse.status}`);
      }

      const { id } = await transcriptResponse.json();
      console.log(`🔄 Transcription started with ID: ${id}`);

      // Poll for completion
      return await this.pollTranscription(id);
    } catch (error) {
      console.error('❌ AssemblyAI transcription error:', error);
      console.log('🔄 Falling back to mock transcription');
      return this.getMockTranscription(audioBuffer);
    }
  }

  async pollTranscription(transcriptId) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: {
            'authorization': this.apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`AssemblyAI polling error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'completed') {
          console.log(`✅ AssemblyAI: Transcription completed - "${data.text}"`);
          return {
            text: data.text,
            confidence: data.confidence || 0.9,
            isFinal: true,
            provider: 'assemblyai'
          };
        } else if (data.status === 'error') {
          throw new Error(`AssemblyAI transcription failed: ${data.error}`);
        }

        console.log(`⏳ AssemblyAI: Status - ${data.status}`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      } catch (error) {
        console.error('❌ AssemblyAI polling error:', error);
        throw error;
      }
    }

    throw new Error('AssemblyAI transcription timeout');
  }

  getMockTranscription(audioBuffer) {
    const size = audioBuffer.byteLength;
    let mockText;
    
    if (size < 1000) {
      mockText = "Hello";
    } else if (size < 5000) {
      mockText = "Hello, how are you?";
    } else if (size < 10000) {
      mockText = "This is a test of the speech recognition system";
    } else {
      mockText = "This is a longer test of the voice recognition capabilities";
    }

    console.log(`🎤 Mock transcription: "${mockText}" (${size} bytes)`);
    return {
      text: mockText,
      confidence: 0.8,
      isFinal: true,
      provider: 'mock'
    };
  }

  async getUsage() {
    if (!this.hasApiKey) {
      return { hours_used: 0, hours_limit: 3 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: {
          'authorization': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`AssemblyAI usage error: ${response.status}`);
      }

      const data = await response.json();
      return {
        hours_used: data.hours_used || 0,
        hours_limit: data.hours_limit || 3
      };
    } catch (error) {
      console.error('❌ Failed to get AssemblyAI usage:', error);
      return { hours_used: 0, hours_limit: 3 };
    }
  }
}

export const assemblyAIService = new AssemblyAIService();
