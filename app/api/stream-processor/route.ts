import { NextRequest } from "next/server";
import { multimodalProcessor } from "@/services/multimodal-processor";
import { AgentOrchestrator } from "@/services/agent-orchestrator";

export async function POST(req: NextRequest) {
    const { text, sketch, speech, photo } = await req.json();

    // Create a ReadableStream for real-time updates
    const stream = new ReadableStream({
        start(controller) {
            (async () => {
                try {
                    // Send initial status
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "started", 
                                step: "Processing inputs..." 
                            })}\n\n`
                        )
                    );

                    // Step 1: Quick validation
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "processing", 
                                step: "Validating inputs...",
                                progress: 10 
                            })}\n\n`
                        )
                    );

                    // Step 2: Process multimodal inputs with progress updates
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "processing", 
                                step: "Analyzing multimodal data...",
                                progress: 30 
                            })}\n\n`
                        )
                    );

                    const processorResult = await multimodalProcessor.processMultimodalInput({
                        text, sketch, speech, photo
                    });

                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "processing", 
                                step: "Generating architectural design...",
                                progress: 60 
                            })}\n\n`
                        )
                    );

                    // Step 3: Generate design
                    const agentOrchestrator = new AgentOrchestrator();
                    const agentResult = await agentOrchestrator.processDesignRequestWithTracing(
                        processorResult.rawResponse,
                        sketch || null
                    );

                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "processing", 
                                step: "Finalizing model...",
                                progress: 90 
                            })}\n\n`
                        )
                    );

                    // Send final result
                    const result = {
                        modelData: agentResult.modelData,
                        code: agentResult.code,
                        metadata: {
                            ...processorResult.metadata,
                            processingTimeMs: agentResult.processingTimeMs,
                        }
                    };

                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "completed", 
                                result,
                                progress: 100 
                            })}\n\n`
                        )
                    );

                } catch (error) {
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ 
                                status: "error", 
                                error: error instanceof Error ? error.message : String(error) 
                            })}\n\n`
                        )
                    );
                } finally {
                    controller.close();
                }
            })();
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}