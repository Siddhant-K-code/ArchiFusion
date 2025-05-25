# 🏗️ ArchiFusion Quick Setup Guide

## Development Mode (No Azure Required)

ArchiFusion works out of the box with intelligent mock AI services for development and testing architectural designs.

### Just Run:
```bash
npm install
npm run dev
```

ArchiFusion automatically uses intelligent mock AI responses when Azure credentials aren't configured.

## Production Mode (Azure Services Required)

### 1. Set Up Azure Services

**Create these Azure resources:**
- Azure OpenAI Service
- Computer Vision Service
- Speech Services (optional)

### 2. Get Your Credentials

From each Azure resource, copy:
- API Key
- Endpoint URL
- Deployment name (for OpenAI)

### 3. Configure Environment

Create `.env.local` file:
```env
# Azure OpenAI
AZURE_OPENAI_KEY=your_actual_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2023-12-01-preview

# Azure Computer Vision
AZURE_VISION_KEY=your_vision_key
AZURE_VISION_ENDPOINT=https://your-vision.cognitiveservices.azure.com

# Azure Speech (optional)
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=eastus
```

### 4. Free Tiers Available

- **Azure Free Account**: $200 credit + free services for 12 months
- **OpenAI Free Tier**: Limited requests per month
- **Computer Vision**: 5,000 free transactions/month
- **Speech Services**: 5 hours free/month

### 5. Quick Azure Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create Resource Group
3. Add these services:
   - Search "OpenAI" → Create Azure OpenAI Service
   - Search "Computer Vision" → Create Computer Vision Service
   - Search "Speech" → Create Speech Service
4. Deploy a model in OpenAI service (gpt-4 or gpt-35-turbo)
5. Copy keys and endpoints to `.env.local`

## Features Working in Development Mode

✅ **3D Model Generation** - Uses intelligent mock responses
✅ **3D Visualization** - Full Three.js rendering
✅ **UI Components** - Complete interface
✅ **Project Management** - All CRUD operations
✅ **Responsive Design** - Works on all devices

## Features Requiring Azure

🔑 **Real AI Processing** - Actual Azure OpenAI responses
🔑 **Image Analysis** - Computer Vision for photos/sketches
🔑 **Speech Recognition** - Convert voice to text
🔑 **Content Moderation** - Safety filters

## Testing Architectural Designs

Try these building prompts in development mode:

- "Design a luxury 2-story villa with 4 bedrooms and home theater"
- "Create a modern coworking space with meditation room"
- "Build a boutique hotel lobby with grand staircase"
- "Generate a medical clinic with 6 examination rooms"
- "Design a tech startup office with gaming area"

The intelligent mock AI will generate different architectural responses based on your building descriptions!