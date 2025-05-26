import { InterpreterAgent } from "./agents/interpreter-agent";
import { DesignerAgent } from "./agents/designer-agent";
import { RendererAgent } from "./agents/renderer-agent";

export class AgentOrchestrator {
    private interpreterAgent: InterpreterAgent;
    private designerAgent: DesignerAgent;
    private rendererAgent: RendererAgent;

    constructor() {
        this.interpreterAgent = new InterpreterAgent();
        this.designerAgent = new DesignerAgent();
        this.rendererAgent = new RendererAgent();
    }

    async processDesignRequest(
        prompt: string,
        sketchData?: string | null
    ): Promise<any> {
        console.log("Agent Orchestrator processing design request...");

        // Set timeout for agent processing
        const agentTimeout = 15000; // 15 seconds for agent processing
        
        return Promise.race([
            this.executeAgentWorkflow(prompt, sketchData),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Agent processing timeout exceeded")), agentTimeout)
            )
        ]);
    }

    private async executeAgentWorkflow(
        prompt: string,
        sketchData?: string | null
    ): Promise<any> {
        try {
            // Process agents in parallel where possible
            console.log("Step 1: Interpreting requirements...");
            const interpreterResult = await Promise.race([
                this.interpreterAgent.execute({ prompt, sketchData }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Interpreter timeout")), 5000)
                )
            ]);

            if ((interpreterResult as any).error) {
                throw new Error(
                    `Interpreter agent failed: ${(interpreterResult as any).error}`
                );
            }

            // Step 2: Generate architectural design
            console.log("Step 2: Generating architectural design...");
            const designerResult = await Promise.race([
                this.designerAgent.execute({
                    requirements: (interpreterResult as any).requirements,
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Designer timeout")), 5000)
                )
            ]);

            if ((designerResult as any).error) {
                throw new Error(
                    `Designer agent failed: ${(designerResult as any).error}`
                );
            }

            // Step 3: Generate Three.js visualization code
            console.log("Step 3: Generating visualization code...");
            const rendererResult = await Promise.race([
                this.rendererAgent.execute({
                    design: (designerResult as any).design,
                    requirements: (interpreterResult as any).requirements,
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Renderer timeout")), 5000)
                )
            ]);

            // Return the complete result
            return {
                requirements: (interpreterResult as any).requirements,
                modelData: (designerResult as any).design,
                code: (rendererResult as any).code,
                originalPrompt: prompt,
                sketchAnalysisPerformed: !!sketchData,
            };
        } catch (error) {
            console.error("Agent Orchestrator error:", error);
            throw new Error(
                `Agent Orchestrator failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    // Additional method for more detailed logging and debugging
    async processDesignRequestWithTracing(
        prompt: string,
        sketchData?: string | null
    ): Promise<any> {
        console.log("Starting traced agent workflow...");
        const startTime = Date.now();

        try {
            const result = await this.processDesignRequest(prompt, sketchData);

            const endTime = Date.now();
            console.log(`Agent workflow completed in ${endTime - startTime}ms`);

            return {
                ...result,
                processingTimeMs: endTime - startTime,
            };
        } catch (error) {
            const endTime = Date.now();
            console.error(
                `Agent workflow failed after ${endTime - startTime}ms:`,
                error
            );
            throw error;
        }
    }
}
