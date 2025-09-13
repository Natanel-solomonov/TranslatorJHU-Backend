#!/usr/bin/env node

// API Setup Script for TranslatorJHU
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 TranslatorJHU API Setup');
console.log('========================\n');

// Check if .env already exists
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Please edit it manually or delete it first.\n');
  process.exit(1);
}

console.log('This script will help you set up API keys for better transcription and voice synthesis.\n');

console.log('📋 Available Free APIs:');
console.log('1. ElevenLabs - 10,000 characters/month free');
console.log('2. AssemblyAI - 3 hours/month free');
console.log('3. Google Cloud - $300 free credit');
console.log('4. Continue without API keys (mock mode)\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  try {
    console.log('🔑 ElevenLabs Setup (Recommended)');
    console.log('1. Go to: https://elevenlabs.io/app/settings/api-keys');
    console.log('2. Sign up for free account');
    console.log('3. Create an API key');
    console.log('4. Copy the key (starts with sk-)\n');
    
    const elevenLabsKey = await question('Enter ElevenLabs API key (or press Enter to skip): ');
    
    console.log('\n🎤 AssemblyAI Setup (For Better Speech Recognition)');
    console.log('1. Go to: https://www.assemblyai.com/app/account');
    console.log('2. Sign up for free account');
    console.log('3. Copy your API key\n');
    
    const assemblyAIKey = await question('Enter AssemblyAI API key (or press Enter to skip): ');
    
    console.log('\n🌐 Google Cloud Setup (Optional)');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Create a new project');
    console.log('3. Enable Speech-to-Text and Translate APIs');
    console.log('4. Create a service account and download JSON key\n');
    
    const googleKey = await question('Enter Google Translate API key (or press Enter to skip): ');
    
    // Create .env file
    const envContent = `# TranslatorJHU API Configuration
# Generated on ${new Date().toISOString()}

# ElevenLabs API (Free: 10,000 characters/month)
ELEVENLABS_API_KEY=${elevenLabsKey || 'your_elevenlabs_api_key_here'}

# AssemblyAI API (Free: 3 hours/month)
ASSEMBLYAI_API_KEY=${assemblyAIKey || 'your_assemblyai_api_key_here'}

# Google Cloud (Optional - $300 free credit)
GOOGLE_TRANSLATE_API_KEY=${googleKey || 'your_google_translate_api_key_here'}
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
`;

    writeFileSync(envPath, envContent);
    
    console.log('\n✅ Configuration saved to .env file!');
    console.log('\n📊 What you can do now:');
    
    if (elevenLabsKey) {
      console.log('🎤 ElevenLabs: High-quality voice synthesis');
    }
    if (assemblyAIKey) {
      console.log('🎤 AssemblyAI: Accurate speech recognition');
    }
    if (googleKey) {
      console.log('🌐 Google Cloud: Translation services');
    }
    if (!elevenLabsKey && !assemblyAIKey && !googleKey) {
      console.log('🔄 Mock mode: Using free fallback services');
    }
    
    console.log('\n🚀 Start the server with: node simple-test-server.js');
    console.log('📱 Test the extension in Chrome');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup();
