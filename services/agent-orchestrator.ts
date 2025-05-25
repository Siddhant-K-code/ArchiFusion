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

        try {
            // Step 1: Interpret the requirements
            console.log("Step 1: Interpreting requirements...");
            const interpreterResult = await this.interpreterAgent.execute({
                prompt,
                sketchData,
            });

            if (interpreterResult.error) {
                throw new Error(
                    `Interpreter agent failed: ${interpreterResult.error}`
                );
            }

            // Step 2: Generate architectural design
            console.log("Step 2: Generating architectural design...");
            const designerResult = await this.designerAgent.execute({
                requirements: interpreterResult.requirements,
            });

            if (designerResult.error) {
                throw new Error(
                    `Designer agent failed: ${designerResult.error}`
                );
            }

            // Step 3: Generate Three.js visualization code
            console.log("Step 3: Generating visualization code...");
            const rendererResult = await this.rendererAgent.execute({
                design: designerResult.design,
                requirements: interpreterResult.requirements,
            });

            // Return the complete result
            return {
                requirements: interpreterResult.requirements,
                modelData: designerResult.design,
                code: rendererResult.code,
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
