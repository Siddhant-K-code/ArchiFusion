import { BaseAgent, AgentInput, AgentOutput } from "./base-agent";
import { AGENT_CONFIG, AZURE_SERVICES_CONFIG } from "./agent-config";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";

export class InterpreterAgent extends BaseAgent {
    private visionClient: ComputerVisionClient;

    constructor() {
        super("Interpreter", AGENT_CONFIG.interpreterSystemPrompt);

        // Initialize Computer Vision client
        const credentials = new ApiKeyCredentials({
            inHeader: {
                "Ocp-Apim-Subscription-Key": AZURE_SERVICES_CONFIG.vision.key,
            },
        });
        this.visionClient = new ComputerVisionClient(
            credentials,
            AZURE_SERVICES_CONFIG.vision.endpoint
        );
    }

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(
            `Interpreter Agent processing input with ${
                input.prompt ? "text prompt" : "no prompt"
            } and ${input.sketchData ? "sketch data" : "no sketch data"}`
        );

        try {
            // Step 1: Pre-process the sketch if available
            let sketchAnalysis = null;
            if (input.sketchData) {
                sketchAnalysis = await this.analyzeSketch(input.sketchData);
            }

            // Step 2: Prepare the prompt for the LLM
            const prompt = this.preparePrompt(input.prompt, sketchAnalysis);

            // Step 3: Call the LLM to interpret requirements
            const llmResponse = await this.callLLM(prompt);

            // Step 4: Parse and validate the response
            const requirements = this.safeParseJSON(llmResponse);

            return {
                originalPrompt: input.prompt,
                sketchAnalysisAvailable: !!sketchAnalysis,
                requirements,
            };
        } catch (error) {
            console.error("Interpreter Agent error:", error);
            return {
                error: `Interpreter Agent failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                originalPrompt: input.prompt,
                requirementsExtracted: false,
            };
        }
    }

    // In interpreter-agent.ts or wherever you define the analyzeSketch function
    /**
     * Analyzes a sketch using Azure Computer Vision
     */
    async analyzeSketch(sketchDataUrl: string): Promise<any> {
        try {
            // Remove the data URL prefix to get the base64 content
            const base64Image = sketchDataUrl.replace(
                /^data:image\/\w+;base64,/,
                ""
            );

            // Analyze the image with Computer Vision - using only supported features
            const result = await this.visionClient.analyzeImageInStream(
                Buffer.from(base64Image, "base64"),
                {
                    visualFeatures: [
                        "Objects",
                        "Categories",
                        "Tags",
                        "Description",
                    ],
                    // "Lines" is not supported, so we removed it
                }
            );

            // Extract lines from detected objects
            const derivedLines = this.extractLinesFromObjects(
                result.objects || []
            );

            // Enhanced analysis for architectural elements
            const enhancedAnalysis = {
                objects: result.objects || [],
                tags: result.tags || [],
                categories: result.categories || [],
                description: result.description?.captions?.[0]?.text || "",
                derivedLines: derivedLines,
                potentialRooms: this.detectPotentialRooms(result, derivedLines),
            };

            return enhancedAnalysis;
        } catch (error) {
            console.error("Error in sketch analysis:", error);
            throw new Error(
                `Sketch analysis failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    private extractLinesFromObjects(objects: any[]): any[] {
        const lines = [];

        // Process each object's bounding box to extract potential lines
        for (const obj of objects || []) {
            if (obj.rectangle) {
                const { x, y, w, h } = obj.rectangle;

                // Create horizontal lines (top and bottom of objects)
                lines.push({
                    type: "horizontal",
                    x1: x,
                    y1: y,
                    x2: x + w,
                    y2: y,
                    confidence: obj.confidence,
                    objectName: obj.object,
                });

                lines.push({
                    type: "horizontal",
                    x1: x,
                    y1: y + h,
                    x2: x + w,
                    y2: y + h,
                    confidence: obj.confidence,
                    objectName: obj.object,
                });

                // Create vertical lines (left and right of objects)
                lines.push({
                    type: "vertical",
                    x1: x,
                    y1: y,
                    x2: x,
                    y2: y + h,
                    confidence: obj.confidence,
                    objectName: obj.object,
                });

                lines.push({
                    type: "vertical",
                    x1: x + w,
                    y1: y,
                    x2: x + w,
                    y2: y + h,
                    confidence: obj.confidence,
                    objectName: obj.object,
                });
            }
        }

        return lines;
    }
    // You'll need to modify detectPotentialRooms to accept derivedLines
    private detectPotentialRooms(
        visionResult: any,
        derivedLines: any[]
    ): any[] {
        // This function should now use the derivedLines parameter instead of visionResult.lines
        const potentialRooms = [];

        // Look for rectangle or square objects that might represent rooms
        const objects = visionResult.objects || [];
        const rectangles = objects.filter(
            (obj: any) =>
                obj.object === "rectangle" ||
                obj.object === "square" ||
                obj.object === "shape"
        );

        // Convert rectangles to potential rooms
        rectangles.forEach((rect: any, index: number) => {
            if (rect.rectangle) {
                potentialRooms.push({
                    name: `room${index + 1}`,
                    bounds: {
                        x: rect.rectangle.x,
                        y: rect.rectangle.y,
                        width: rect.rectangle.w,
                        height: rect.rectangle.h,
                    },
                    confidence: rect.confidence,
                });
            }
        });

        // If we have lines, try to detect rooms from them
        if (derivedLines && derivedLines.length > 0) {
            // Group lines by orientation (horizontal/vertical)
            const horizontalLines = derivedLines.filter(
                (line: any) => line.type === "horizontal"
            );
            const verticalLines = derivedLines.filter(
                (line: any) => line.type === "vertical"
            );

            // Add overall room if no specific rooms were detected
            if (
                potentialRooms.length === 0 &&
                (horizontalLines.length > 0 || verticalLines.length > 0)
            ) {
                // Calculate the bounds based on lines
                const allX = derivedLines.flatMap((l: any) => [l.x1, l.x2]);
                const allY = derivedLines.flatMap((l: any) => [l.y1, l.y2]);

                const minX = Math.min(...allX);
                const maxX = Math.max(...allX);
                const minY = Math.min(...allY);
                const maxY = Math.max(...allY);

                potentialRooms.push({
                    name: "mainRoom",
                    bounds: {
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                    },
                    confidence: 0.8,
                });
            }
        }

        return potentialRooms;
    }

    private estimateDimensions(visionResult: any): any {
        // Logic to estimate dimensions from the sketch
        // This would use scale inference in a real implementation
        return {
            estimatedScale: "unknown",
            estimatedUnitSize: "unknown",
        };
    }

    private preparePrompt(textPrompt: string, sketchAnalysis: any): string {
        let prompt =
            "Extract architectural requirements from the following information:\n\n";

        if (textPrompt) {
            prompt += `TEXT DESCRIPTION:\n${textPrompt}\n\n`;
        }

        if (sketchAnalysis) {
            prompt += `SKETCH ANALYSIS:\n${JSON.stringify(
                sketchAnalysis,
                null,
                2
            )}\n\n`;
        }

        prompt += `Based on the above, extract the following in JSON format:
1. Rooms: types, dimensions, and relationships
2. Design preferences: style, materials, etc.
3. Special features: windows, doors, etc.
4. Constraints: budget, accessibility, etc.

Format your response as a valid JSON object with these elements.`;

        return prompt;
    }
}
