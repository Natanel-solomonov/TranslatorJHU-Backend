# TranslatorJHU Backend

Real-time translation backend server with STT, Gemini AI translation, and natural TTS synthesis.

## 🚀 Features

- **Real-time Speech-to-Text**: Google Cloud Speech API with streaming recognition
- **AI-Powered Translation**: Google Gemini 1.5 Flash for contextual, nuanced translations
- **Natural Text-to-Speech**: Multiple TTS providers (ElevenLabs, Azure, Google, Cartesia)
- **WebSocket Communication**: Real-time bidirectional communication with frontend
- **Session Management**: Persistent translation sessions with conversation context
- **Voice Activity Detection**: Smart audio processing and silence handling

## 🛠 Tech Stack

- **Node.js + TypeScript**: Modern server-side development
- **Express**: REST API framework
- **WebSocket (ws)**: Real-time communication
- **Google Cloud Speech-to-Text**: Streaming STT with high accuracy
- **Google Gemini AI**: Advanced translation with context awareness
- **Multiple TTS Providers**: ElevenLabs, Azure Neural TTS, Google Cloud TTS, Cartesia
- **Pino**: Structured logging
- **Helmet + CORS**: Security middleware

## 📦 Installation

### Prerequisites

1. **Google Cloud Account**: For Speech-to-Text API
2. **Gemini API Key**: For translation services
3. **TTS Provider Account**: ElevenLabs (recommended) or Azure/Google

### Development Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment Configuration**:

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your API keys:

   ```env
   # Google Cloud Speech-to-Text
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

   # Google Gemini AI
   GEMINI_API_KEY=your-gemini-api-key

   # ElevenLabs TTS (recommended)
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   ELEVENLABS_VOICE_ID=your-preferred-voice-id
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable                         | Description                           | Required |
| -------------------------------- | ------------------------------------- | -------- |
| `GEMINI_API_KEY`                 | Google Gemini API key for translation | ✅       |
| `GOOGLE_CLOUD_PROJECT_ID`        | Google Cloud project ID               | ✅       |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON          | ✅       |
| `ELEVENLABS_API_KEY`             | ElevenLabs API key (recommended TTS)  | ⚠️       |
| `AZURE_SPEECH_KEY`               | Azure Cognitive Services key          | ⚠️       |
| `AZURE_SPEECH_REGION`            | Azure region                          | ⚠️       |

⚠️ At least one TTS provider is required

### Optional Configuration

```env
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
WS_PORT=8080
WS_HOST=localhost
```

## 📁 Project Structure

```
src/
├── server.ts              # Main server entry point
├── utils/
│   └── logger.ts          # Structured logging configuration
├── middleware/
│   └── errorHandler.ts    # Global error handling
├── routes/
│   ├── health.ts          # Health check endpoints
│   └── config.ts          # Configuration endpoints
├── websocket/
│   └── websocketHandler.ts # WebSocket connection management
└── services/
    ├── translationPipeline.ts # Main translation orchestration
    ├── stt/
    │   └── sttService.ts      # Google Cloud Speech-to-Text
    ├── translation/
    │   └── translationService.ts # Gemini AI translation
    └── tts/
        └── ttsService.ts      # Multi-provider TTS synthesis
```

## 🎯 API Endpoints

### REST API

- `GET /api/health` - Health check with service status
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /api/config` - Get supported languages and features
- `GET /api/config/languages` - Get supported languages
- `GET /api/config/voices` - Get available TTS voices

### WebSocket API

Connect to `ws://localhost:8080/ws`

#### Client → Server Messages

```typescript
// Start translation session
{
  type: 'session:start',
  data: {
    sessionId: string,
    sourceLanguage: string,
    targetLanguage: string
  }
}

// Stop translation session
{
  type: 'session:stop',
  data: { sessionId: string }
}

// Start audio streaming
{
  type: 'audio:start',
  data: { sessionId: string }
}

// Binary audio data
ArrayBuffer // Raw audio chunks

// Stop audio streaming
{
  type: 'audio:stop',
  data: { sessionId: string }
}
```

#### Server → Client Messages

```typescript
// Transcription result
{
  type: 'transcription',
  data: {
    id: string,
    text: string,
    confidence: number,
    isFinal: boolean,
    timestamp: number
  }
}

// Translation result with audio
{
  type: 'translation',
  data: {
    captionId: string,
    translatedText: string,
    confidence: number,
    audioData?: ArrayBuffer
  }
}

// Session events
{
  type: 'session:started' | 'session:stopped' | 'audio:started' | 'audio:stopped',
  data: { message: string }
}

// Errors
{
  type: 'error',
  data: { error: string }
}
```

## 🔍 Translation Pipeline

1. **Audio Input**: Receive audio chunks via WebSocket
2. **Speech-to-Text**: Google Cloud Speech API processes audio
3. **Translation**: Gemini AI translates with conversation context
4. **Text-to-Speech**: Generate natural audio with selected TTS provider
5. **Output**: Send translated text and audio back to client

### Gemini AI Translation Features

- **Contextual Translation**: Maintains conversation history for better accuracy
- **Meeting-Optimized**: Specialized prompts for business/academic contexts
- **Glossary Support**: Custom term preservation
- **Natural Language**: Conversational tone preservation

### TTS Provider Comparison

| Provider         | Quality    | Latency | Languages | Cost |
| ---------------- | ---------- | ------- | --------- | ---- |
| **ElevenLabs**   | ⭐⭐⭐⭐⭐ | ~150ms  | 29+       | $$$  |
| **Azure Neural** | ⭐⭐⭐⭐   | ~200ms  | 100+      | $$   |
| **Google Cloud** | ⭐⭐⭐⭐   | ~250ms  | 40+       | $$   |
| **Cartesia**     | ⭐⭐⭐⭐⭐ | ~100ms  | Limited   | $$$  |

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["npm", "start"]
```

### Cloud Platforms

- **Google Cloud Run**: Recommended for proximity to Gemini API
- **AWS ECS/Fargate**: Good performance with proper region selection
- **Fly.io**: Simple deployment with global edge locations

## 🔍 Development

### Available Scripts

- `npm run dev`: Development server with hot reload
- `npm run build`: TypeScript compilation
- `npm start`: Production server
- `npm run lint`: ESLint checks
- `npm run type-check`: TypeScript validation

### Health Monitoring

The server provides comprehensive health checks:

```bash
# Basic health check
curl http://localhost:8080/api/health

# Service-specific status
curl http://localhost:8080/api/health/ready
```

Response includes:

- Overall health status
- Individual service availability (STT, Translation, TTS)
- Uptime and version information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
