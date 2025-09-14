import { DatabaseService } from './databaseService.js';

export class VoiceCloningService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  // Create a custom voice model from user's audio files (base64 method)
  async createCustomVoice(userId, voiceName, audioFiles) {
    try {
      console.log(`🎤 Creating custom voice for user: ${userId}`);
      
      // Check if API key has voice cloning permissions
      const hasVoiceCloningPermission = await this.checkVoiceCloningPermissions();
      if (!hasVoiceCloningPermission) {
        return {
          success: false,
          error: 'ElevenLabs API key does not have voice cloning permissions. Please upgrade your plan or use a different API key.'
        };
      }
      
      // Prepare audio files for ElevenLabs
      const preparedFiles = await this.prepareAudioFiles(audioFiles);
      
      // Create voice cloning request
      const voiceData = {
        name: voiceName,
        description: `Custom voice for user ${userId}`,
        files: preparedFiles
      };

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(voiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ElevenLabs API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `ElevenLabs API error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log(`✅ Custom voice created: ${result.voice_id}`);
      
      return {
        success: true,
        voiceId: result.voice_id,
        voiceName: result.name,
        message: 'Custom voice created successfully'
      };
    } catch (error) {
      console.error('❌ Voice cloning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if API key has voice cloning permissions
  async checkVoiceCloningPermissions() {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        return false;
      }

      const userData = await response.json();
      // Check if user has voice cloning permissions
      return userData.subscription && userData.subscription.tier !== 'free';
    } catch (error) {
      console.error('❌ Error checking voice cloning permissions:', error);
      return false;
    }
  }

  // Prepare audio files for ElevenLabs API (base64 method)
  async prepareAudioFiles(audioFiles) {
    const preparedFiles = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      
      // Convert ArrayBuffer to base64
      const base64Audio = Buffer.from(audioFile.audioData).toString('base64');
      
      // Create a file object for ElevenLabs API
      const fileData = {
        name: `phrase_${i + 1}.webm`,
        data: base64Audio,
        mimeType: audioFile.mimeType || 'audio/webm'
      };
      
      preparedFiles.push(fileData);
    }
    
    return preparedFiles;
  }

  // Alternative method using multipart form data (if base64 doesn't work)
  async createCustomVoiceMultipart(userId, voiceName, audioFiles) {
    console.log(`🎤 Creating custom voice (multipart) for user: ${userId}`);
    
    try {
      // Import FormData dynamically for Node.js
      const { FormData } = await import('form-data');
      const formData = new FormData();
      
      formData.append('name', voiceName);
      formData.append('description', `Custom voice for user ${userId}`);
      
      // Add each audio file
      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        // Convert ArrayBuffer to Buffer for Node.js FormData
        const buffer = Buffer.from(audioFile.audioData);
        formData.append('files', buffer, {
          filename: `phrase_${i + 1}.webm`,
          contentType: audioFile.mimeType || 'audio/webm'
        });
      }

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          ...formData.getHeaders() // Add proper headers for multipart
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ElevenLabs API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `ElevenLabs API error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log(`✅ Custom voice created: ${result.voice_id}`);
      
      return {
        success: true,
        voiceId: result.voice_id,
        voiceName: result.name,
        message: 'Custom voice created successfully'
      };
    } catch (error) {
      console.error('❌ Voice cloning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all custom voices for a user
  async getUserCustomVoices(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const result = await response.json();
      
      // Filter voices that belong to this user (by name pattern)
      const userVoices = result.voices.filter(voice => 
        voice.name.includes(`user_${userId}`) || 
        voice.description.includes(`user ${userId}`)
      );

      return {
        success: true,
        voices: userVoices
      };
    } catch (error) {
      console.error('❌ Error fetching user voices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a custom voice
  async deleteCustomVoice(voiceId) {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete voice: ${response.status}`);
      }

      console.log(`✅ Custom voice deleted: ${voiceId}`);
      return {
        success: true,
        message: 'Voice deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting voice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate speech using custom voice
  async generateSpeechWithCustomVoice(text, voiceId, options = {}) {
    try {
      const requestData = {
        text: text,
        voice_id: voiceId,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.5,
          style: options.style || 0.0,
          use_speaker_boost: options.useSpeakerBoost || true
        }
      };

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return {
        success: true,
        audioData: audioBuffer,
        message: 'Speech generated successfully'
      };
    } catch (error) {
      console.error('❌ TTS generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Complete voice cloning process for a user
  async completeVoiceCloning(userId, username, audioFiles) {
    try {
      console.log(`🎤 Starting voice cloning process for user: ${username}`);
      
      // Create voice name
      const voiceName = `user_${userId}_${username}`;
      
      // Try multipart method first (more reliable for file uploads)
      let result;
      try {
        result = await this.createCustomVoiceMultipart(userId, voiceName, audioFiles);
      } catch (error) {
        console.log('⚠️ Voice cloning failed:', error.message);
        if (error.message.includes('missing_permissions') || error.message.includes('401')) {
          return {
            success: false,
            error: 'Voice cloning requires a paid ElevenLabs subscription. The system will use the default voice for TTS.',
            fallback: true
          };
        }
        result = { success: false, error: error.message };
      }
      
      // If multipart fails due to permissions, provide clear message
      if (!result.success && (result.error.includes('missing_permissions') || result.error.includes('401'))) {
        console.log('⚠️ Voice cloning requires paid ElevenLabs subscription');
        return {
          success: false,
          error: 'Voice cloning requires a paid ElevenLabs subscription. The system will use the default voice for TTS.',
          fallback: true
        };
      }
      
      // If multipart fails, try base64 method
      if (!result.success) {
        console.log('🔄 Trying base64 method...');
        try {
          result = await this.createCustomVoice(userId, voiceName, audioFiles);
        } catch (error) {
          console.log('⚠️ Base64 method failed:', error.message);
          result = { success: false, error: error.message };
        }
      }
      
      if (result.success) {
        // Update user in database with voice ID
        await DatabaseService.updateUserVoiceId(userId, result.voiceId);
        
        console.log(`✅ Voice cloning completed for user: ${username}`);
        return {
          success: true,
          voiceId: result.voiceId,
          voiceName: result.voiceName,
          message: 'Voice cloning completed successfully'
        };
      } else {
        // Check if it's a permission error
        if (result.error.includes('missing_permissions') || result.error.includes('401')) {
          return {
            success: false,
            error: 'Voice cloning requires a paid ElevenLabs subscription. The system will use the default voice for TTS.',
            fallback: true
          };
        }
        return {
          success: false,
          error: result.error,
          fallback: true
        };
      }
    } catch (error) {
      console.error('❌ Voice cloning process failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }
}

export default VoiceCloningService;
