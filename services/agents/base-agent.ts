import { AzureOpenAI } from "openai";
import { AZURE_SERVICES_CONFIG } from "./agent-config";

export type AgentInput = {
    [key: string]: any;
};

export type AgentOutput = {
    [key: string]: any;
};

export abstract class BaseAgent {
    protected client: AzureOpenAI;
    protected name: string;
    protected systemPrompt: string;

    constructor(name: string, systemPrompt: string) {
        this.name = name;
        this.systemPrompt = systemPrompt;

        // Initialize Azure OpenAI client
        this.client = new AzureOpenAI({
            apiKey: AZURE_SERVICES_CONFIG.openai.key,
            apiVersion: AZURE_SERVICES_CONFIG.openai.apiVersion,
            endpoint: AZURE_SERVICES_CONFIG.openai.endpoint,
        });
    }

    // All agents must implement an execute method
    abstract execute(input: AgentInput): Promise<AgentOutput>;

    // Common method to call Azure OpenAI
    protected async callLLM(
        prompt: string,
        temperature: number = 0.2
    ): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: AZURE_SERVICES_CONFIG.openai.deployment,
                messages: [
                    { role: "system", content: this.systemPrompt },
                    { role: "user", content: prompt },
                ],
                temperature,
            });

            return response.choices[0].message?.content || "";
        } catch (error) {
            console.error(`Error in ${this.name} agent LLM call:`, error);
            throw new Error(
                `${this.name} agent failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    // Common method to parse JSON from LLM responses safely
    protected safeParseJSON(text: string): any {
        try {
            // Try to find JSON in the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // If no JSON pattern found, attempt to parse the whole text
            return JSON.parse(text);
        } catch (error) {
            console.error(`Error parsing JSON in ${this.name} agent:`, error);
            console.debug("Raw text:", text);
            // Return a minimal valid object
            return { error: "Failed to parse response", raw: text };
        }
    }
}
