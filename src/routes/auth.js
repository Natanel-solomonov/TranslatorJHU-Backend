import express from 'express';
import { DatabaseService } from '../services/databaseService.js';
import { VoiceCloningService } from '../services/voiceCloningService.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    const result = await DatabaseService.getUserByUsername(username.trim().toLowerCase());
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Database error occurred.'
      });
    }

    if (!result.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign up first.'
      });
    }

    // Convert Prisma user to frontend format
    const user = {
      id: result.user.id,
      username: result.user.username,
      voiceEnrolled: result.user.voiceEnrolled,
      createdAt: result.user.createdAt,
      lastLogin: new Date()
    };

    res.json({
      success: true,
      user,
      message: 'Login successful!'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await DatabaseService.getUserByUsername(normalizedUsername);
    
    if (existingUser.success && existingUser.user) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists. Please choose a different one.'
      });
    }

    // Create new user
    const result = await DatabaseService.createUser(normalizedUsername);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to create user.'
      });
    }

    // Convert Prisma user to frontend format
    const user = {
      id: result.user.id,
      username: result.user.username,
      voiceEnrolled: result.user.voiceEnrolled,
      createdAt: result.user.createdAt,
      lastLogin: new Date()
    };

    res.status(201).json({
      success: true,
      user,
      message: 'Account created successfully!'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed. Please try again.'
    });
  }
});

// Complete voice enrollment endpoint with voice cloning
router.post('/complete-voice-enrollment', async (req, res) => {
  try {
    const { userId, username, audioRecordings } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required for voice cloning.'
      });
    }

    if (!audioRecordings || !Array.isArray(audioRecordings) || audioRecordings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Audio recordings are required.'
      });
    }

    // Convert array back to ArrayBuffer for each recording
    const processedRecordings = audioRecordings.map(recording => ({
      phraseId: recording.phraseId,
      phrase: recording.phrase,
      audioData: new Uint8Array(recording.audioData).buffer, // Convert array back to ArrayBuffer
      recorded: recording.recorded
    }));

    // Initialize voice cloning service
        const voiceCloningService = new VoiceCloningService(process.env.ELEVENLABS_API_KEY);

    // Complete voice enrollment with voice cloning
    const result = await DatabaseService.completeVoiceEnrollmentWithCloning(
      userId, 
      username, 
      processedRecordings, 
      voiceCloningService
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to complete voice enrollment.'
      });
    }

    // Convert Prisma user to frontend format
    const user = {
      id: result.user.id,
      username: result.user.username,
      voiceEnrolled: result.user.voiceEnrolled,
      voiceId: result.voiceId,
      voiceName: result.voiceName,
      createdAt: result.user.createdAt,
      lastLogin: new Date()
    };

    res.json({
      success: true,
      user,
      message: result.message,
      audioFilesCount: result.audioFiles.length,
      voiceId: result.voiceId,
      voiceName: result.voiceName,
      cloningError: result.cloningError || null
    });
  } catch (error) {
    console.error('Voice enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Voice enrollment failed. Please try again.'
    });
  }
});

// Get all users endpoint (for testing)
router.get('/users', async (req, res) => {
  try {
    const result = await DatabaseService.getAllUsers();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve users.'
      });
    }

    // Convert users to frontend format
    const users = result.users.map(user => ({
      id: user.id,
      username: user.username,
      voiceEnrolled: user.voiceEnrolled,
      createdAt: user.createdAt,
      audioFilesCount: user.audioFiles?.length || 0
    }));

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.'
    });
  }
});

// Get user audio files endpoint
router.get('/user/:userId/audio-files', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await DatabaseService.getAudioFilesByUserId(userId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve audio files.'
      });
    }

    // Convert audio files to base64 for transmission
    const audioFiles = result.audioFiles.map(file => ({
      id: file.id,
      phraseId: file.phraseId,
      phrase: file.phrase,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
      audioData: Buffer.from(file.audioData).toString('base64') // Convert to base64
    }));

    res.json({
      success: true,
      audioFiles
    });
  } catch (error) {
    console.error('Get audio files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audio files.'
    });
  }
});

export default router;
