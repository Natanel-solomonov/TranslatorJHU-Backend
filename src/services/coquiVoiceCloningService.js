import { DatabaseService } from './databaseService.js';

export class CoquiVoiceCloningService {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://app.coqui.ai/api/v1';
  }

  // Create a custom voice model from user's audio files using Coqui.ai
  async createCustomVoice(userId, voiceName, audioFiles) {
    try {
      console.log(`🎤 Creating custom voice with Coqui.ai for user: ${userId}`);
      
      // Prepare audio files for Coqui.ai
      const preparedFiles = await this.prepareAudioFiles(audioFiles);
      
      // Create voice cloning request
      const voiceData = {
        name: voiceName,
        description: `Custom voice for user ${userId}`,
        files: preparedFiles
      };

      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(voiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Coqui.ai API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Coqui.ai API error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log(`✅ Custom voice created with Coqui.ai: ${result.voice_id}`);
      
      return {
        success: true,
        voiceId: result.voice_id,
        voiceName: result.name,
        message: 'Custom voice created successfully with Coqui.ai'
      };
    } catch (error) {
      console.error('❌ Coqui.ai voice cloning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Alternative method using multipart form data
  async createCustomVoiceMultipart(userId, voiceName, audioFiles) {
    console.log(`🎤 Creating custom voice (multipart) with Coqui.ai for user: ${userId}`);
    
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

      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Coqui.ai API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Coqui.ai API error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log(`✅ Custom voice created with Coqui.ai: ${result.voice_id}`);
      
      return {
        success: true,
        voiceId: result.voice_id,
        voiceName: result.name,
        message: 'Custom voice created successfully with Coqui.ai'
      };
    } catch (error) {
      console.error('❌ Coqui.ai voice cloning error:', error);
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
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        console.log('❌ Coqui.ai API key validation failed');
        return false;
      }

      const userData = await response.json();
      console.log('✅ Coqui.ai API key validated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error checking Coqui.ai permissions:', error);
      return false;
    }
  }

  // Prepare audio files for Coqui.ai API
  async prepareAudioFiles(audioFiles) {
    const preparedFiles = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      
      // Convert ArrayBuffer to base64
      const base64Audio = Buffer.from(audioFile.audioData).toString('base64');
      
      // Create a file object for Coqui.ai API
      const fileData = {
        name: `phrase_${i + 1}.webm`,
        data: base64Audio,
        mimeType: audioFile.mimeType || 'audio/webm'
      };
      
      preparedFiles.push(fileData);
    }
    
    return preparedFiles;
  }

  // Get all custom voices for a user
  async getUserCustomVoices(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        console.error(`❌ Failed to get voices: ${response.status}`);
        return { success: false, error: 'Failed to get voices' };
      }

      const voices = await response.json();
      console.log(`✅ Retrieved ${voices.length} custom voices`);
      
      return {
        success: true,
        voices: voices
      };
    } catch (error) {
      console.error('❌ Error getting custom voices:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete voice cloning process with fallback handling
  async completeVoiceCloning(userId, username, audioFiles) {
    try {
      console.log(`🎤 Starting Coqui.ai voice cloning process for user: ${username}`);
      
      // Create voice name
      const voiceName = `user_${userId}_${username}`;
      
      // Try multipart method first (more reliable for file uploads)
      let result;
      try {
        result = await this.createCustomVoiceMultipart(userId, voiceName, audioFiles);
      } catch (error) {
        console.log('⚠️ Coqui.ai voice cloning failed:', error.message);
        if (error.message.includes('unauthorized') || error.message.includes('401')) {
          return {
            success: false,
            error: 'Coqui.ai API key is invalid or expired. Please check your API key.',
            fallback: true
          };
        }
        result = { success: false, error: error.message };
      }
      
      // If multipart fails due to permissions, provide clear message
      if (!result.success && (result.error.includes('unauthorized') || result.error.includes('401'))) {
        console.log('⚠️ Coqui.ai API key issue');
        return {
          success: false,
          error: 'Coqui.ai API key is invalid or expired. Please check your API key.',
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
        console.log(`✅ Coqui.ai voice cloning completed for user: ${username}`);
        return {
          success: true,
          voiceId: result.voiceId,
          voiceName: result.voiceName,
          message: 'Voice cloning completed successfully with Coqui.ai'
        };
      } else {
        // Check if it's a permission error
        if (result.error.includes('unauthorized') || result.error.includes('401')) {
          return {
            success: false,
            error: 'Coqui.ai API key is invalid or expired. Please check your API key.',
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
      console.error('❌ Coqui.ai voice cloning process failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }
}
