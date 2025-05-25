# 🏗️ ArchiFusion - AI Architectural Designer

ArchiFusion is a revolutionary AI-powered platform that transforms your architectural ideas into stunning 3D building models. Simply describe your vision in natural language and watch as our advanced AI generates detailed floor plans, 3D visualizations, and architectural designs for houses, offices, retail spaces, medical facilities, and more.

**From Words to Worlds** - Turn architectural concepts into reality with the power of AI.

<img width="1482" alt="image" src="https://github.com/user-attachments/assets/404bea95-05fa-4afb-bf51-e7d6650199f7" />

## 🚀 Key Features

- **Text-to-Architecture:** Transform natural language descriptions into detailed 3D building models
- **Multi-Building Types:** Design houses, offices, retail spaces, medical clinics, hotels, and more
- **Instant Visualization:** Real-time 3D rendering with customizable lighting and viewing angles
- **Detailed Floor Plans:** Automatically generated room layouts with doors, windows, and connections
- **Export Ready:** Download models in GLTF, OBJ formats for use in other design tools
- **Azure AI Powered:** Leverages Azure OpenAI and Computer Vision for intelligent design generation

## 🛠 Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **UI Components:** Shadcn UI
- **3D Visualization:** Three.js
- **AI Integration:** Azure OpenAI, Azure Computer Vision

## 🚀 Getting Started

### Installation

Clone the repository:

```bash
git clone https://github.com/Siddhant-K-code/archifusion.git
cd archifusion
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the root directory:

```env
# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Azure OpenAI Configuration
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
AZURE_OPENAI_API_VERSION=2023-12-01-preview

# Azure Computer Vision
AZURE_VISION_KEY=your_azure_vision_key
AZURE_VISION_ENDPOINT=https://your-vision-resource.cognitiveservices.azure.com
```

Run the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the app.

## ⚙️ Configuration Guide

### Agent Configuration

Customize the multi-agent system in `agent-config.ts`:

```ts
export const AZURE_SERVICES_CONFIG = {
    openai: {
        key: process.env.AZURE_OPENAI_KEY || "",
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4",
        apiVersion:
            process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview",
    },
    vision: {
        key: process.env.AZURE_VISION_KEY || "",
        endpoint: process.env.AZURE_VISION_ENDPOINT || "",
    },
};

export const AGENT_CONFIG = {
    maxRetries: 2,
    defaultTemperature: 0.2,
    interpreterSystemPrompt: `You are an Architectural Interpreter Agent...`,
    designerSystemPrompt: `You are an Architectural Designer Agent...`,
    rendererSystemPrompt: `You are a 3D Rendering Agent...`,
};
```

### Setting Up Azure Services

Check the [Azure Setup Guide](README_SETUP.md) for detailed instructions on configuring Azure OpenAI and Computer Vision services.

**Azure OpenAI:**

-   Create an Azure OpenAI resource and deploy a model.
-   Add your key and endpoint details to `.env.local`.

**Azure Computer Vision:**

-   Set up an Azure Computer Vision resource.
-   Update your key and endpoint in `.env.local`.
