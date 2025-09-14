import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

export class DatabaseService {
  // User operations
  static async createUser(username, email = null) {
    try {
      const user = await prisma.user.create({
        data: {
          username,
          email,
          voiceEnrolled: false
        }
      });
      console.log(`✅ User created: ${username}`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserByUsername(username) {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        include: { audioFiles: true }
      });
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserById(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { audioFiles: true }
      });
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error getting user by ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateUserVoiceEnrollment(userId, voiceEnrolled) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { voiceEnrolled }
      });
      console.log(`✅ User voice enrollment updated: ${voiceEnrolled}`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error updating voice enrollment:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateUserVoiceId(userId, voiceId, voiceName = null) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          voiceId,
          voiceName: voiceName || `user_${userId}_voice`
        }
      });
      console.log(`✅ User voice ID updated: ${voiceId}`);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error updating voice ID:', error);
      return { success: false, error: error.message };
    }
  }

  // Audio file operations
  static async saveAudioFile(userId, phraseId, phrase, audioData, mimeType) {
    try {
      // Convert ArrayBuffer to Buffer if needed
      let buffer;
      if (audioData instanceof ArrayBuffer) {
        buffer = Buffer.from(audioData);
      } else if (audioData instanceof Buffer) {
        buffer = audioData;
      } else {
        throw new Error('Invalid audio data format');
      }

      const audioFile = await prisma.audioFile.create({
        data: {
          userId,
          phraseId,
          phrase,
          audioData: buffer,
          mimeType,
          fileSize: buffer.length
        }
      });

      console.log(`✅ Audio file saved: ${phraseId} (${buffer.length} bytes)`);
      return { success: true, audioFile };
    } catch (error) {
      console.error('❌ Error saving audio file:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAudioFilesByUserId(userId) {
    try {
      const audioFiles = await prisma.audioFile.findMany({
        where: { userId },
        orderBy: { phraseId: 'asc' }
      });
      return { success: true, audioFiles };
    } catch (error) {
      console.error('❌ Error getting audio files:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteAudioFilesByUserId(userId) {
    try {
      await prisma.audioFile.deleteMany({
        where: { userId }
      });
      console.log(`✅ Audio files deleted for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting audio files:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete voice enrollment process
  static async completeVoiceEnrollment(userId, audioRecordings) {
    try {
      // First, delete any existing audio files for this user
      await this.deleteAudioFilesByUserId(userId);

      // Save all audio files
      const savedFiles = [];
      for (const recording of audioRecordings) {
        if (recording.recorded && recording.audioData) {
          const result = await this.saveAudioFile(
            userId,
            recording.phraseId,
            recording.phrase,
            recording.audioData,
            'audio/webm' // Default MIME type
          );
          
          if (result.success) {
            savedFiles.push(result.audioFile);
          } else {
            throw new Error(`Failed to save audio file: ${result.error}`);
          }
        }
      }

      // Update user voice enrollment status
      const userResult = await this.updateUserVoiceEnrollment(userId, true);
      
      if (!userResult.success) {
        throw new Error(`Failed to update user: ${userResult.error}`);
      }

      console.log(`✅ Voice enrollment completed for user: ${userId} (${savedFiles.length} files)`);
      return { 
        success: true, 
        user: userResult.user, 
        audioFiles: savedFiles 
      };
    } catch (error) {
      console.error('❌ Error completing voice enrollment:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete voice enrollment with voice cloning
  static async completeVoiceEnrollmentWithCloning(userId, username, audioRecordings, voiceCloningService) {
    try {
      // First, complete regular voice enrollment
      const enrollmentResult = await this.completeVoiceEnrollment(userId, audioRecordings);
      
      if (!enrollmentResult.success) {
        return enrollmentResult;
      }

      // Now perform voice cloning
      console.log(`🎤 Starting voice cloning for user: ${username}`);
      const cloningResult = await voiceCloningService.completeVoiceCloning(
        userId, 
        username, 
        audioRecordings
      );

      if (cloningResult.success) {
        console.log(`✅ Voice cloning completed for user: ${username}`);
        return {
          success: true,
          user: enrollmentResult.user,
          audioFiles: enrollmentResult.audioFiles,
          voiceId: cloningResult.voiceId,
          voiceName: cloningResult.voiceName,
          message: 'Voice enrollment and cloning completed successfully'
        };
      } else {
        console.log(`⚠️ Voice cloning failed for user: ${username}, but enrollment succeeded`);
        return {
          success: true,
          user: enrollmentResult.user,
          audioFiles: enrollmentResult.audioFiles,
          voiceId: null,
          voiceName: null,
          message: 'Voice enrollment completed, but voice cloning failed',
          cloningError: cloningResult.error
        };
      }
    } catch (error) {
      console.error('❌ Error completing voice enrollment with cloning:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all users (for testing)
  static async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        include: { audioFiles: true },
        orderBy: { createdAt: 'desc' }
      });
      return { success: true, users };
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup method
  static async disconnect() {
    await prisma.$disconnect();
  }
}

export default DatabaseService;
