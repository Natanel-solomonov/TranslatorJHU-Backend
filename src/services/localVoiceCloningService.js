import { DatabaseService } from './databaseService.js';
import fs from 'fs';
import path from 'path';

export class LocalVoiceCloningService {
  constructor() {
    this.voicesDirectory = './voices';
    this.ensureVoicesDirectory();
  }

  // Ensure voices directory exists
  ensureVoicesDirectory() {
    if (!fs.existsSync(this.voicesDirectory)) {
      fs.mkdirSync(this.voicesDirectory, { recursive: true });
      console.log(`📁 Created voices directory: ${this.voicesDirectory}`);
    }
  }

  // Create a custom voice profile from user's audio files
  async createCustomVoice(userId, username, audioFiles) {
    try {
      console.log(`🎤 Creating local voice profile for user: ${username}`);
      
      // Create user-specific voice directory
      const userVoiceDir = path.join(this.voicesDirectory, `user_${userId}`);
      if (!fs.existsSync(userVoiceDir)) {
        fs.mkdirSync(userVoiceDir, { recursive: true });
      }

      // Save audio files locally
      const savedFiles = [];
      for (let i = 0; i < audioFiles.length; i++) {
        const audioFile = audioFiles[i];
        const fileName = `phrase_${i + 1}.webm`;
        const filePath = path.join(userVoiceDir, fileName);
        
        // Convert ArrayBuffer to Buffer and save
        const buffer = Buffer.from(audioFile.audioData);
        fs.writeFileSync(filePath, buffer);
        
        savedFiles.push({
          fileName,
          filePath,
          phrase: audioFile.phrase || `Phrase ${i + 1}`
        });
        
        console.log(`💾 Saved audio file: ${fileName} (${buffer.length} bytes)`);
      }

      // Create voice profile metadata
      const voiceProfile = {
        userId,
        username,
        voiceId: `local_voice_${userId}`,
        voiceName: `Voice of ${username}`,
        createdAt: new Date().toISOString(),
        audioFiles: savedFiles,
        totalDuration: this.estimateAudioDuration(savedFiles),
        quality: this.assessVoiceQuality(savedFiles)
      };

      // Save voice profile
      const profilePath = path.join(userVoiceDir, 'voice_profile.json');
      fs.writeFileSync(profilePath, JSON.stringify(voiceProfile, null, 2));
      
      console.log(`✅ Local voice profile created for user: ${username}`);
      console.log(`📊 Voice quality: ${voiceProfile.quality}`);
      console.log(`⏱️ Estimated duration: ${voiceProfile.totalDuration}s`);
      
      return {
        success: true,
        voiceId: voiceProfile.voiceId,
        voiceName: voiceProfile.voiceName,
        message: 'Local voice profile created successfully',
        profile: voiceProfile
      };
    } catch (error) {
      console.error('❌ Local voice cloning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Estimate total audio duration (rough calculation)
  estimateAudioDuration(audioFiles) {
    // Rough estimation: assume 1 second per 16KB of audio data
    let totalBytes = 0;
    for (const file of audioFiles) {
      const stats = fs.statSync(file.filePath);
      totalBytes += stats.size;
    }
    return Math.round(totalBytes / 16000); // Rough seconds
  }

  // Assess voice quality based on file characteristics
  assessVoiceQuality(audioFiles) {
    if (audioFiles.length < 3) return 'Poor';
    
    let totalSize = 0;
    for (const file of audioFiles) {
      const stats = fs.statSync(file.filePath);
      totalSize += stats.size;
    }
    
    const avgSize = totalSize / audioFiles.length;
    
    if (avgSize > 50000) return 'Excellent'; // >50KB per file
    if (avgSize > 20000) return 'Good';      // >20KB per file
    if (avgSize > 10000) return 'Fair';      // >10KB per file
    return 'Poor';
  }

  // Get voice profile for a user
  async getVoiceProfile(userId) {
    try {
      const userVoiceDir = path.join(this.voicesDirectory, `user_${userId}`);
      const profilePath = path.join(userVoiceDir, 'voice_profile.json');
      
      if (!fs.existsSync(profilePath)) {
        return { success: false, error: 'Voice profile not found' };
      }
      
      const profileData = fs.readFileSync(profilePath, 'utf8');
      const profile = JSON.parse(profileData);
      
      return {
        success: true,
        profile
      };
    } catch (error) {
      console.error('❌ Error getting voice profile:', error);
      return { success: false, error: error.message };
    }
  }

  // List all voice profiles
  async listVoiceProfiles() {
    try {
      const profiles = [];
      
      if (!fs.existsSync(this.voicesDirectory)) {
        return { success: true, profiles: [] };
      }
      
      const userDirs = fs.readdirSync(this.voicesDirectory);
      
      for (const userDir of userDirs) {
        if (userDir.startsWith('user_')) {
          const profilePath = path.join(this.voicesDirectory, userDir, 'voice_profile.json');
          if (fs.existsSync(profilePath)) {
            const profileData = fs.readFileSync(profilePath, 'utf8');
            const profile = JSON.parse(profileData);
            profiles.push(profile);
          }
        }
      }
      
      return {
        success: true,
        profiles
      };
    } catch (error) {
      console.error('❌ Error listing voice profiles:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete voice cloning process (local version)
  async completeVoiceCloning(userId, username, audioFiles) {
    try {
      console.log(`🎤 Starting local voice cloning process for user: ${username}`);
      
      // Create local voice profile
      const result = await this.createCustomVoice(userId, username, audioFiles);
      
      if (result.success) {
        // Update user in database with voice ID
        await DatabaseService.updateUserVoiceId(userId, result.voiceId);
        console.log(`✅ Local voice cloning completed for user: ${username}`);
        return {
          success: true,
          voiceId: result.voiceId,
          voiceName: result.voiceName,
          message: 'Local voice profile created successfully',
          profile: result.profile
        };
      } else {
        return {
          success: false,
          error: result.error,
          fallback: true
        };
      }
    } catch (error) {
      console.error('❌ Local voice cloning process failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  // Generate TTS using local voice profile (placeholder for future enhancement)
  async generateTTSWithVoice(text, voiceId, language = 'en') {
    try {
      console.log(`🎵 Generating TTS with local voice: ${voiceId}`);
      
      // For now, this is a placeholder that would integrate with a local TTS engine
      // In the future, this could use Coqui TTS or other local solutions
      
      return {
        success: true,
        message: 'TTS generation with local voice (placeholder)',
        voiceId,
        text,
        language
      };
    } catch (error) {
      console.error('❌ Local TTS generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
