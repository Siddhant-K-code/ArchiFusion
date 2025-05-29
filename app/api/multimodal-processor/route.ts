import { NextResponse } from "next/server";

// Dynamic imports to avoid initialization during build
let multimodalProcessor: any;
let AgentOrchestrator: any;
let agentOrchestrator: any;

export async function POST(req: Request) {
    try {
        // Initialize services dynamically
        if (!multimodalProcessor) {
            const { multimodalProcessor: mp } = await import("@/services/multimodal-processor");
            multimodalProcessor = mp;
        }
        if (!agentOrchestrator) {
            const { AgentOrchestrator } = await import("@/services/agent-orchestrator");
            agentOrchestrator = new AgentOrchestrator();
        }

        // Parse the request body
        const body = await req.json();
        const { text, sketch, speech, photo } = body;

        // Validate that at least one input type is provided
        if (!text && !sketch && !speech && !photo) {
            return NextResponse.json(
                {
                    error: "At least one input type (text, sketch, speech, or photo) is required",
                },
                { status: 400 }
            );
        }

        console.log(`Processing multimodal request with:
            - Text: ${text ? "provided" : "not provided"}
            - Sketch: ${sketch ? "provided" : "not provided"}
            - Speech: ${speech ? "provided" : "not provided"}
            - Photo: ${photo ? "provided" : "not provided"}`);

        // Phase 1: Process all inputs using multimodal processor
        const processorResult =
            await multimodalProcessor.processMultimodalInput({
                text,
                sketch,
                speech,
                photo,
            });

        // Extract requirements from the processor result
        const requirements = processorResult.modelData;

        // Phase 2: Generate architectural design using existing agent architecture
        // Use the extracted requirements as input to the agent orchestrator
        const agentResult =
            await agentOrchestrator.processDesignRequestWithTracing(
                // Pass the raw response as context for the agent
                processorResult.rawResponse,
                // Pass sketch data only if it was in the original input
                sketch || null
            );

        // Combine the results
        const combinedResult = {
            modelData: agentResult.modelData,
            code: agentResult.code,
            metadata: {
                ...processorResult.metadata,
                processingTimeMs: agentResult.processingTimeMs,
            },
        };

        return NextResponse.json(combinedResult);
    } catch (error) {
        console.error("Error in multimodal processor API:", error);

        // Provide detailed error message
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            {
                error: "Failed to process multimodal input",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
