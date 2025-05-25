// Configuration for Azure services used by the agent system
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
    // Add other Azure service configurations as needed
};

// Agent system configuration
export const AGENT_CONFIG = {
    maxRetries: 2,
    defaultTemperature: 0.2,
    interpreterSystemPrompt: `You are an Architectural Interpreter Agent. Your role is to analyze sketches and textual descriptions to extract precise architectural requirements. Extract room types, dimensions, relationships, and design preferences. Format your output as structured JSON.`,
    designerSystemPrompt: `You are an Architectural Designer Agent. Your role is to create detailed architectural layouts based on requirements. You must follow building codes and design principles. Create layouts with proper dimensions and spatial relationships.`,
    rendererSystemPrompt: `You are a 3D Rendering Agent. Your role is to generate Three.js code that accurately visualizes architectural designs. Create clean, optimized code with appropriate lighting, materials, and camera positioning.`,
};
