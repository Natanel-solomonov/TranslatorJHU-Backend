// API Configuration
// Add your API keys here

export const API_KEYS = {
  // ElevenLabs API (Free: 10,000 characters/month)
  // Get your key at: https://elevenlabs.io/app/settings/api-keys
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  
  // Google Cloud (Optional - $300 free credit)
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || '',
  
  // AssemblyAI (Optional - 3 hours free/month)
  // Get your key at: https://www.assemblyai.com/app/account
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || 'your_assemblyai_api_key_here',
};

export const FREE_APIS = {
  // MyMemory Translation API (completely free, no key needed)
  MYMEMORY_TRANSLATE: 'https://api.mymemory.translated.net/get',
  
  // LibreTranslate (completely free, no key needed)
  LIBRE_TRANSLATE: 'https://libretranslate.com/translate',
};
