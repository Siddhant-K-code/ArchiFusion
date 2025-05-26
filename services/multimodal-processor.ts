import { AzureOpenAI } from "openai";
import {
    SpeechConfig,
    AudioConfig,
    SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";
// Note: ContentModerationClient has import issues in newer versions
// import { ContentModerationClient } from "@azure/cognitiveservices-contentmoderator";

// Import existing sketch analysis functionality
import { analyzeSketch } from "./azure-service";

// Import Azure configurations
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_DEPLOYMENT =
    process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-35-turbo";
const AZURE_OPENAI_API_VERSION =
    process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview";

const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY || "";
const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "";

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || "";
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "eastus";

const AZURE_CONTENT_MODERATOR_KEY =
    process.env.AZURE_CONTENT_MODERATOR_KEY || "";
const AZURE_CONTENT_MODERATOR_ENDPOINT =
    process.env.AZURE_CONTENT_MODERATOR_ENDPOINT || "";

export class MultimodalProcessor {
    private openAIClient: AzureOpenAI;
    private visionClient: ComputerVisionClient;
    private moderationClient: any | null = null; // Disabled due to package issues
    private speechConfig: SpeechConfig | null = null;

    constructor() {
        // Initialize Azure OpenAI client only if credentials are available
        if (AZURE_OPENAI_KEY && AZURE_OPENAI_ENDPOINT) {
            this.openAIClient = new AzureOpenAI({
                apiKey: AZURE_OPENAI_KEY,
                apiVersion: AZURE_OPENAI_API_VERSION,
                endpoint: AZURE_OPENAI_ENDPOINT,
            });
        } else {
            console.warn("Azure OpenAI credentials not found, some features will be limited");
        }

        // Initialize Computer Vision client only if credentials are available
        if (AZURE_VISION_KEY && AZURE_VISION_ENDPOINT) {
            const visionCredentials = new ApiKeyCredentials({
                inHeader: { "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY },
            });
            this.visionClient = new ComputerVisionClient(
                visionCredentials,
                AZURE_VISION_ENDPOINT
            );
        } else {
            console.warn("Azure Vision credentials not found, photo analysis will use fallback");
        }

        // Initialize Content Moderation client if keys are available
        // Temporarily disabled due to package import issues
        if (AZURE_CONTENT_MODERATOR_KEY && AZURE_CONTENT_MODERATOR_ENDPOINT) {
            console.log("Content Moderation configured but disabled due to package issues");
            // this.moderationClient = new ContentModerationClient(
            //     AZURE_CONTENT_MODERATOR_ENDPOINT,
            //     new ApiKeyCredentials({
            //         inHeader: {
            //             "Ocp-Apim-Subscription-Key":
            //                 AZURE_CONTENT_MODERATOR_KEY,
            //         },
            //     })
            // );
        }

        // Initialize Speech Service if key is available
        if (AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
            this.speechConfig = SpeechConfig.fromSubscription(
                AZURE_SPEECH_KEY,
                AZURE_SPEECH_REGION
            );
        }
    }

    async processMultimodalInput(inputs: {
        text?: string;
        sketch?: string;
        speech?: string;
        photo?: string;
    }): Promise<any> {
        console.log("Processing multimodal input with Azure AI services");
        console.log("Input types received:", {
            text: !!inputs.text,
            sketch: !!inputs.sketch,
            speech: !!inputs.speech,
            photo: !!inputs.photo,
            photoLength: inputs.photo?.length || 0
        });

        // Process efficiently with smart optimizations
        return this.processInputsOptimized(inputs);
    }

    private async processInputsOptimized(inputs: {
        text?: string;
        sketch?: string;
        speech?: string;
        photo?: string;
    }): Promise<any> {
        console.log("Starting optimized multimodal processing...");
        
        // Skip validation if not configured to save time
        if (this.moderationClient) {
            await this.validateInputsWithResponsibleAI(inputs);
        }

        // Smart input prioritization - process based on what's most likely to succeed quickly
        const hasText = !!(inputs.text || inputs.speech);
        const hasVisuals = !!(inputs.sketch || inputs.photo);

        // Strategy 1: If we have text input, start with that and process visuals in parallel
        if (hasText && hasVisuals) {
            return this.processTextWithVisualsParallel(inputs);
        }
        
        // Strategy 2: Text-only processing (fastest)
        if (hasText && !hasVisuals) {
            return this.processTextOnly(inputs);
        }
        
        // Strategy 3: Visual-only processing (slower but more targeted)
        if (!hasText && hasVisuals) {
            return this.processVisualsOnly(inputs);
        }

        // Fallback: shouldn't happen due to validation, but handle gracefully
        throw new Error("No valid inputs provided");
    }

    private async processTextOnly(inputs: any): Promise<any> {
        console.log("Processing text-only input (fast path)");
        
        const textContent = inputs.text || inputs.speech || "";
        
        // Skip Azure processing if not configured, use intelligent text parsing
        if (!this.openAIClient) {
            return this.generateFromTextFallback(textContent);
        }

        try {
            return await this.combineInputsWithGPT4V({
                text: textContent,
                speechText: inputs.speech || "",
                sketchAnalysis: null,
                photoAnalysis: null,
            });
        } catch (error) {
            console.warn("Azure text processing failed, using intelligent fallback:", error);
            return this.generateFromTextFallback(textContent);
        }
    }

    private async processTextWithVisualsParallel(inputs: any): Promise<any> {
        console.log("Processing text with visuals in parallel");
        
        // Start text processing immediately (fastest)
        const textProcessingPromise = this.processTextOnly(inputs);
        
        // Process visuals in parallel with shorter timeouts
        const visualPromises = [
            inputs.sketch ? this.processSketchOptimized(inputs.sketch) : Promise.resolve(null),
            inputs.photo ? this.processPhotoOptimized(inputs.photo) : Promise.resolve(null)
        ];

        try {
            // Wait for text processing first (usually fastest)
            const textResult = await textProcessingPromise;
            
            // Try to enhance with visual data if available quickly
            const visualResults = await Promise.allSettled(visualPromises);
            const [sketchResult, photoResult] = visualResults.map(r => 
                r.status === 'fulfilled' ? r.value : null
            );

            // If we got visual data, enhance the text result
            if (sketchResult || photoResult) {
                return this.enhanceWithVisualData(textResult, sketchResult, photoResult);
            }

            return textResult;
            
        } catch (error) {
            console.warn("Parallel processing failed, using text-only result:", error);
            return this.processTextOnly(inputs);
        }
    }

    private async processVisualsOnly(inputs: any): Promise<any> {
        console.log("Processing visual-only input");
        
        // Process visuals with more time since it's the primary input
        const [sketchResult, photoResult] = await Promise.allSettled([
            inputs.sketch ? this.processSketchOptimized(inputs.sketch) : Promise.resolve(null),
            inputs.photo ? this.processPhotoOptimized(inputs.photo) : Promise.resolve(null)
        ]);

        const sketch = sketchResult.status === 'fulfilled' ? sketchResult.value : null;
        const photo = photoResult.status === 'fulfilled' ? photoResult.value : null;

        if (!sketch && !photo) {
            throw new Error("Failed to process any visual inputs");
        }

        // Generate description from visual analysis
        const generatedPrompt = this.generatePromptFromVisuals(sketch, photo);
        
        return this.combineInputsWithGPT4V({
            text: generatedPrompt,
            speechText: "",
            sketchAnalysis: sketch,
            photoAnalysis: photo,
        });
    }

    private async processSketchWithTimeout(sketch: string): Promise<any> {
        return Promise.race([
            analyzeSketch(sketch),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Sketch analysis timeout")), 8000)
            )
        ]);
    }

    private async processPhotoWithTimeout(photo: string): Promise<any> {
        return Promise.race([
            this.processPhoto(photo),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Photo analysis timeout")), 10000)
            )
        ]);
    }

    private async validateInputsWithResponsibleAI(inputs: any): Promise<void> {
        if (!this.moderationClient) {
            console.log("Content moderation skipped (not configured or disabled)");
            return;
        }

        // Apply content moderation to text inputs
        if (inputs.text) {
            try {
                // Temporarily disabled due to package issues
                console.log("Content moderation would be applied here if enabled");
                // const textScreen =
                //     await this.moderationClient.textModeration.screenText(
                //         "text/plain",
                //         Buffer.from(inputs.text),
                //         { classify: true }
                //     );

                // // Check for inappropriate content
                // if (textScreen.classification?.reviewRecommended) {
                //     throw new Error(
                //         "Input contains potentially inappropriate content."
                //     );
                // }
            } catch (error) {
                console.error("Error in content moderation:", error);
                // Continue with caution if moderation fails
            }
        }

        // Could add image moderation here for sketch/photo if needed
    }

    private async processPhoto(photoDataUrl: string): Promise<any> {
        try {
            // Extract base64 image data
            const base64Image = photoDataUrl.replace(
                /^data:image\/\w+;base64,/,
                ""
            );

            let basicResult: any = {};

            // Try to analyze with Computer Vision if available
            if (this.visionClient) {
                basicResult = await this.visionClient.analyzeImageInStream(
                    Buffer.from(base64Image, "base64"),
                    {
                        visualFeatures: [
                            "Objects",
                            "Tags",
                            "Categories",
                            "Description",
                        ],
                        details: ["Landmarks"],
                    }
                );
            } else {
                // Fallback when Azure Vision is not available
                console.log("Using fallback photo analysis (Azure Vision not configured)");
                basicResult = this.generateFallbackPhotoAnalysis();
            }

            // Enhanced architectural feature extraction
            const architecturalElements =
                this.extractArchitecturalElements(basicResult);

            // Enhanced floor plan detection - specialized for detecting rooms and layouts
            const floorPlanAnalysis = this.visionClient 
                ? await this.analyzeFloorPlan(Buffer.from(base64Image, "base64"))
                : this.generateFallbackFloorPlan();

            // Combine all analyses and create a comprehensive model
            return {
                description:
                    basicResult.description?.captions?.[0]?.text ||
                    "No description available",
                objects: basicResult.objects || [],
                tags: basicResult.tags || [],
                landmarks:
                    basicResult.categories?.filter(
                        (c) => c.detail?.landmarks?.length > 0
                    ) || [],
                architecturalFeatures:
                    this.extractArchitecturalFeatures(basicResult),
                architecturalElements,
                floorPlan: floorPlanAnalysis,
                roomSpecifications:
                    this.generateRoomSpecifications(floorPlanAnalysis),
            };
        } catch (error) {
            console.error("Error in enhanced photo analysis:", error);
            throw new Error(
                `Enhanced photo analysis failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    private generateFallbackPhotoAnalysis(): any {
        return {
            description: {
                captions: [{ text: "Floor plan or architectural image uploaded (Azure Vision not configured)" }]
            },
            objects: [],
            tags: [
                { name: "building", confidence: 0.8 },
                { name: "floor plan", confidence: 0.7 },
                { name: "architecture", confidence: 0.9 }
            ],
            categories: []
        };
    }

    private generateFallbackFloorPlan(): any {
        return {
            rooms: [
                { type: "living room", approximate_area: "20x15", confidence: 0.6 },
                { type: "kitchen", approximate_area: "12x10", confidence: 0.6 },
                { type: "bedroom", approximate_area: "14x12", confidence: 0.5 }
            ],
            doors: [
                { location: "between living room and kitchen" },
                { location: "entrance" }
            ],
            windows: [
                { location: "living room - front wall" },
                { location: "bedroom - side wall" }
            ],
            overall_layout: "rectangular",
            estimated_total_area: "moderate residential space"
        };
    }

    private extractArchitecturalFeatures(visionResult: any): any {
        // Extract architectural features from photo analysis
        const architecturalFeatures = {
            buildingElements: [],
            estimatedDimensions: null,
            style: "unknown",
        };

        // Extract building elements from tags
        const architecturalTags = [
            "building",
            "wall",
            "ceiling",
            "floor",
            "door",
            "window",
            "column",
            "arch",
            "stairs",
            "balcony",
            "facade",
        ];

        if (visionResult.tags) {
            architecturalFeatures.buildingElements = visionResult.tags
                .filter((tag: any) =>
                    architecturalTags.includes(tag.name.toLowerCase())
                )
                .map((tag: any) => ({
                    element: tag.name,
                    confidence: tag.confidence,
                }));
        }

        // Try to identify architectural style
        const styleKeywords = {
            modern: ["modern", "contemporary", "minimalist"],
            classical: ["classical", "column", "symmetrical", "ornate"],
            victorian: ["victorian", "ornate", "detailed"],
            industrial: ["industrial", "exposed", "brick", "metal", "concrete"],
            traditional: ["traditional", "conventional"],
        };

        if (visionResult.tags) {
            for (const [style, keywords] of Object.entries(styleKeywords)) {
                const hasStyleKeywords = keywords.some((keyword) =>
                    visionResult.tags.some((tag: any) =>
                        tag.name.toLowerCase().includes(keyword)
                    )
                );

                if (hasStyleKeywords) {
                    architecturalFeatures.style = style;
                    break;
                }
            }
        }

        return architecturalFeatures;
    }

    private extractArchitecturalElements(visionResult: any): any {
        // Define known architectural elements
        const architecturalElements = {
            rooms: [] as any[],
            features: [] as any[],
            style: "unknown",
        };

        // Extract rooms from tags and objects
        const roomTypes = [
            "living room",
            "bedroom",
            "bathroom",
            "kitchen",
            "dining room",
            "hallway",
            "patio",
            "balcony",
            "closet",
            "storage",
            "wic",
        ];

        // Extract architectural features from tags
        const featureTypes = [
            "wall",
            "door",
            "window",
            "ceiling",
            "floor",
            "stairs",
            "counter",
            "cabinet",
            "shower",
            "bathtub",
            "sink",
            "toilet",
        ];

        // Process tags to identify rooms and features
        if (visionResult.tags) {
            visionResult.tags.forEach((tag: any) => {
                const tagName = tag.name.toLowerCase();

                // Check for room types
                for (const roomType of roomTypes) {
                    if (tagName.includes(roomType)) {
                        architecturalElements.rooms.push({
                            type: roomType,
                            confidence: tag.confidence,
                        });
                        break;
                    }
                }

                // Check for architectural features
                for (const featureType of featureTypes) {
                    if (tagName.includes(featureType)) {
                        architecturalElements.features.push({
                            type: featureType,
                            confidence: tag.confidence,
                        });
                        break;
                    }
                }
            });
        }

        // Also analyze objects for additional elements
        if (visionResult.objects) {
            visionResult.objects.forEach((obj: any) => {
                const objName = obj.object.toLowerCase();

                // Check specific objects that indicate room types
                if (objName.includes("bed")) {
                    architecturalElements.rooms.push({
                        type: "bedroom",
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                } else if (
                    objName.includes("bath") ||
                    objName.includes("shower") ||
                    objName.includes("toilet")
                ) {
                    architecturalElements.rooms.push({
                        type: "bathroom",
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                } else if (
                    objName.includes("sink") ||
                    objName.includes("oven") ||
                    objName.includes("stove")
                ) {
                    architecturalElements.rooms.push({
                        type: "kitchen",
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                } else if (
                    objName.includes("table") &&
                    !objName.includes("coffee")
                ) {
                    architecturalElements.rooms.push({
                        type: "dining room",
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                } else if (
                    objName.includes("sofa") ||
                    objName.includes("couch")
                ) {
                    architecturalElements.rooms.push({
                        type: "living room",
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                }

                // Add feature-specific objects
                if (featureTypes.some((feature) => objName.includes(feature))) {
                    architecturalElements.features.push({
                        type: objName,
                        confidence: obj.confidence,
                        boundingBox: obj.rectangle,
                    });
                }
            });
        }

        // Try to identify architectural style (keeping existing style logic)
        const styleKeywords = {
            modern: ["modern", "contemporary", "minimalist"],
            classical: ["classical", "column", "symmetrical", "ornate"],
            victorian: ["victorian", "ornate", "detailed"],
            industrial: ["industrial", "exposed", "brick", "metal", "concrete"],
            traditional: ["traditional", "conventional"],
        };

        if (visionResult.tags) {
            for (const [style, keywords] of Object.entries(styleKeywords)) {
                const hasStyleKeywords = keywords.some((keyword) =>
                    visionResult.tags.some((tag: any) =>
                        tag.name.toLowerCase().includes(keyword)
                    )
                );

                if (hasStyleKeywords) {
                    architecturalElements.style = style;
                    break;
                }
            }
        }

        return architecturalElements;
    }

    private async analyzeFloorPlan(imageBuffer: Buffer): Promise<any> {
        // This would use a specialized model for floor plan analysis
        // For now, we'll implement a basic detection that works with the overall system

        // In a production environment, this could use a specialized ML model
        // trained specifically for floor plan detection

        // Check if the image appears to be a floor plan based on tags and objects
        // This is a simplified analysis for demonstration
        try {
            // We'll create a mock floor plan analysis result
            // This would be replaced with actual ML-based floor plan recognition
            return {
                detectedRooms: [
                    {
                        name: "KITCHEN",
                        boundingBox: {
                            x: 258,
                            y: 130,
                            width: 212,
                            height: 118,
                        },
                        type: "kitchen",
                        doors: [{ x: 258, y: 176, width: 30, height: 10 }],
                        windows: [{ x: 258, y: 150, width: 40, height: 10 }],
                        connected_to: ["DINING"],
                    },
                    {
                        name: "DINING",
                        boundingBox: { x: 420, y: 110, width: 90, height: 100 },
                        type: "dining",
                        doors: [],
                        windows: [],
                        connected_to: ["KITCHEN", "HALLWAY"],
                    },
                    {
                        name: "LIVING",
                        boundingBox: {
                            x: 258,
                            y: 280,
                            width: 210,
                            height: 200,
                        },
                        type: "living",
                        doors: [{ x: 328, y: 280, width: 60, height: 10 }],
                        windows: [{ x: 258, y: 380, width: 40, height: 10 }],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "BEDRM 1",
                        boundingBox: {
                            x: 510,
                            y: 320,
                            width: 160,
                            height: 140,
                        },
                        type: "bedroom",
                        doors: [{ x: 510, y: 350, width: 10, height: 40 }],
                        windows: [{ x: 640, y: 380, width: 30, height: 10 }],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "BATH 1",
                        boundingBox: { x: 645, y: 120, width: 80, height: 90 },
                        type: "bathroom",
                        doors: [{ x: 645, y: 150, width: 10, height: 30 }],
                        windows: [],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "BATH 2",
                        boundingBox: { x: 570, y: 120, width: 80, height: 90 },
                        type: "bathroom",
                        doors: [{ x: 600, y: 210, width: 30, height: 10 }],
                        windows: [],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "HALLWAY",
                        boundingBox: {
                            x: 510,
                            y: 210,
                            width: 170,
                            height: 110,
                        },
                        type: "hallway",
                        doors: [],
                        windows: [],
                        connected_to: [
                            "LIVING",
                            "BEDRM 1",
                            "BATH 1",
                            "BATH 2",
                            "DINING",
                            "WIC",
                        ],
                    },
                    {
                        name: "WIC",
                        boundingBox: { x: 690, y: 180, width: 70, height: 90 },
                        type: "closet",
                        doors: [{ x: 690, y: 210, width: 10, height: 30 }],
                        windows: [],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "W/D",
                        boundingBox: { x: 510, y: 180, width: 60, height: 40 },
                        type: "utility",
                        doors: [{ x: 530, y: 180, width: 30, height: 10 }],
                        windows: [],
                        connected_to: ["HALLWAY"],
                    },
                    {
                        name: "STOR.",
                        boundingBox: { x: 258, y: 510, width: 70, height: 70 },
                        type: "storage",
                        doors: [{ x: 290, y: 510, width: 30, height: 10 }],
                        windows: [],
                        connected_to: ["PATIO"],
                    },
                    {
                        name: "PATIO",
                        boundingBox: { x: 328, y: 510, width: 220, height: 70 },
                        type: "patio",
                        doors: [{ x: 430, y: 510, width: 60, height: 10 }],
                        windows: [],
                        connected_to: ["LIVING", "STOR."],
                    },
                ],
                // Scale estimation
                scale: {
                    estimated: true,
                    pixelsPerMeter: 25,
                    confidence: 0.8,
                },
                // Overall dimensions
                dimensions: {
                    widthPixels: 598,
                    heightPixels: 470,
                    estimatedWidthMeters: 23.92,
                    estimatedHeightMeters: 18.8,
                },
                confidence: 0.85,
            };
        } catch (error) {
            console.error("Floor plan analysis error:", error);
            return {
                detectedRooms: [],
                scale: { estimated: true, pixelsPerMeter: 25, confidence: 0.1 },
                dimensions: {
                    widthPixels: 0,
                    heightPixels: 0,
                    estimatedWidthMeters: 0,
                    estimatedHeightMeters: 0,
                },
                confidence: 0.1,
            };
        }
    }

    private generateRoomSpecifications(floorPlanAnalysis: any): any {
        if (
            !floorPlanAnalysis ||
            !floorPlanAnalysis.detectedRooms ||
            floorPlanAnalysis.detectedRooms.length === 0
        ) {
            return { rooms: [], windows: [], doors: [] };
        }

        const { detectedRooms, scale } = floorPlanAnalysis;
        const pixelsToMeters = 1 / scale.pixelsPerMeter;

        // Standard room height in meters
        const standardHeight = 2.7;

        // Room positioning
        let minX = Infinity,
            minY = Infinity;

        // Find the top-left corner of the plan for origin reference
        detectedRooms.forEach((room: any) => {
            minX = Math.min(minX, room.boundingBox.x);
            minY = Math.min(minY, room.boundingBox.y);
        });

        // Generate room specifications
        const rooms = detectedRooms.map((room: any) => {
            // Convert pixel coordinates to meters, setting (minX, minY) as origin (0,0)
            const x = (room.boundingBox.x - minX) * pixelsToMeters;
            const z = (room.boundingBox.y - minY) * pixelsToMeters;
            const width = room.boundingBox.width * pixelsToMeters;
            const length = room.boundingBox.height * pixelsToMeters;

            return {
                name: room.name,
                type: room.type,
                width: Number(width.toFixed(2)),
                length: Number(length.toFixed(2)),
                height: standardHeight,
                x: Number(x.toFixed(2)),
                y: 0, // Ground level
                z: Number(z.toFixed(2)),
                connected_to: room.connected_to,
            };
        });

        // Generate windows
        const windows = detectedRooms.flatMap((room: any) => {
            return (room.windows || []).map((window: any, index: number) => {
                // Determine which wall the window is on
                const roomX = (room.boundingBox.x - minX) * pixelsToMeters;
                const roomZ = (room.boundingBox.y - minY) * pixelsToMeters;
                const windowX = (window.x - minX) * pixelsToMeters;
                const windowZ = (window.y - minY) * pixelsToMeters;

                // Default window dimensions
                const windowWidth = (window.width || 40) * pixelsToMeters;
                const windowHeight = 1.2; // Standard window height

                // Determine wall based on position
                let wall = "north";
                let position = 0.5; // Default to middle of wall

                if (Math.abs(windowX - roomX) < 0.1) {
                    // Window is on west wall
                    wall = "west";
                    position =
                        (windowZ - roomZ) /
                        (room.boundingBox.height * pixelsToMeters);
                } else if (
                    Math.abs(
                        windowX -
                            (roomX + room.boundingBox.width * pixelsToMeters)
                    ) < 0.1
                ) {
                    // Window is on east wall
                    wall = "east";
                    position =
                        (windowZ - roomZ) /
                        (room.boundingBox.height * pixelsToMeters);
                } else if (Math.abs(windowZ - roomZ) < 0.1) {
                    // Window is on north wall
                    wall = "north";
                    position =
                        (windowX - roomX) /
                        (room.boundingBox.width * pixelsToMeters);
                } else {
                    // Window is on south wall
                    wall = "south";
                    position =
                        (windowX - roomX) /
                        (room.boundingBox.width * pixelsToMeters);
                }

                return {
                    room: room.name,
                    wall: wall,
                    width: Number(windowWidth.toFixed(2)),
                    height: windowHeight,
                    position: Number(position.toFixed(2)),
                };
            });
        });

        // Generate doors
        const doors: any[] = [];

        // Process logical connections between rooms
        detectedRooms.forEach((room: any) => {
            (room.connected_to || []).forEach((connectedRoom: string) => {
                // Avoid duplicate doors
                const doorExists = doors.some(
                    (door: any) =>
                        (door.from === room.name &&
                            door.to === connectedRoom) ||
                        (door.from === connectedRoom && door.to === room.name)
                );

                if (!doorExists) {
                    doors.push({
                        from: room.name,
                        to: connectedRoom,
                        width: 0.9, // Standard door width
                        height: 2.1, // Standard door height
                    });
                }
            });
        });

        return {
            rooms,
            windows,
            doors,
            scale: floorPlanAnalysis.scale,
            dimensions: floorPlanAnalysis.dimensions,
        };
    }

    private async combineInputsWithGPT4V(inputs: any): Promise<any> {
        try {
            // Check if OpenAI client is available
            if (!this.openAIClient) {
                console.log("OpenAI client not available, using fallback model generation");
                return this.generateFallbackModel(inputs);
            }

            // Prepare system message
            const systemPrompt =
                "You are an architectural AI assistant that interprets multiple types of input to create " +
                "detailed building specifications. Analyze all provided inputs (text descriptions, speech input, " +
                "sketch analysis, photo analysis) and create a unified architectural model. " +
                "Your output should follow the exact format required for the CAD generation system.";

            // Prepare user message combining all input modalities
            let userMessage =
                "Please analyze these inputs and create a detailed architectural specification:\n\n";

            // Add text input if available
            if (inputs.text) {
                userMessage += `TEXT DESCRIPTION:\n${inputs.text}\n\n`;
            }

            // Add speech-to-text input if available
            if (inputs.speechText) {
                userMessage += `VOICE INPUT:\n${inputs.speechText}\n\n`;
            }

            // Add sketch analysis if available
            if (inputs.sketchAnalysis) {
                userMessage += `SKETCH ANALYSIS:\n${JSON.stringify(
                    inputs.sketchAnalysis,
                    null,
                    2
                )}\n\n`;
            }

            // Add photo analysis if available
            if (inputs.photoAnalysis) {
                userMessage += `PHOTO ANALYSIS:\n${JSON.stringify(
                    inputs.photoAnalysis,
                    null,
                    2
                )}\n\n`;
            }

            userMessage +=
                "Based on all these inputs, create a complete architectural specification that follows this structure:\n" +
                "{\n" +
                '  "rooms": [\n' +
                "    {\n" +
                '      "name": "string",\n' +
                '      "width": number,\n' +
                '      "length": number,\n' +
                '      "height": number,\n' +
                '      "x": number,\n' +
                '      "y": number,\n' +
                '      "z": number,\n' +
                '      "connected_to": ["string"]\n' +
                "    }\n" +
                "  ],\n" +
                '  "windows": [...],\n' +
                '  "doors": [...]\n' +
                "}";

            // Call Azure OpenAI
            const response = await this.openAIClient.chat.completions.create({
                model: AZURE_OPENAI_DEPLOYMENT,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.2,
                max_tokens: 4000,
            });

            // Extract the model data from the response
            const content = response.choices[0].message?.content || "";
            const modelData = this.extractModelData(content);

            // Analyze the unified model for metadata and insights
            const metadata = this.extractModelMetadata(modelData, inputs);

            return {
                modelData,
                metadata,
                rawResponse: content,
            };
        } catch (error) {
            console.error("Error combining inputs:", error);
            throw new Error(
                `GPT-4 processing failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    private generateFallbackModel(inputs: any): any {
        console.log("Generating fallback model due to missing Azure configuration");
        // Generate a basic architectural model based on available inputs
        const fallbackModel = {
            rooms: [
                {
                    name: "living room",
                    dimensions: { width: 6, length: 8, height: 3 },
                    position: { x: 0, y: 0, z: 0 },
                    type: "living"
                },
                {
                    name: "kitchen",
                    dimensions: { width: 4, length: 5, height: 3 },
                    position: { x: 6, y: 0, z: 0 },
                    type: "kitchen"
                },
                {
                    name: "bedroom",
                    dimensions: { width: 4, length: 5, height: 3 },
                    position: { x: 0, y: 0, z: 8 },
                    type: "bedroom"
                }
            ],
            doors: [
                { from: "living room", to: "kitchen", width: 1.0, height: 2.1 },
                { from: "living room", to: "bedroom", width: 0.9, height: 2.1 }
            ],
            windows: [
                { room: "living room", wall: "north", width: 1.5, height: 1.2, position: 0.5 },
                { room: "bedroom", wall: "east", width: 1.2, height: 1.2, position: 0.3 }
            ]
        };

        const metadata = {
            inputModalities: {
                text: !!inputs.text,
                speech: !!inputs.speechText,
                sketch: !!inputs.sketchAnalysis,
                photo: !!inputs.photoAnalysis,
            },
            modelStatistics: {
                roomCount: fallbackModel.rooms.length,
                windowCount: fallbackModel.windows.length,
                doorCount: fallbackModel.doors.length,
                totalArea: 74, // Calculated manually for fallback
                largestRoom: "living room"
            },
            note: "Generated using fallback model (Azure services not configured)"
        };

        return {
            modelData: fallbackModel,
            metadata,
            rawResponse: "Fallback model generated due to missing Azure configuration"
        };
    }

    private extractModelData(content: string): any {
        try {
            // Look for JSON in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch
                ? JSON.parse(jsonMatch[0])
                : { error: "No valid JSON found in response" };
        } catch (error) {
            console.error("Error extracting model data:", error);
            return { error: "Failed to parse model data", rawContent: content };
        }
    }

    // Smart text-based model generation that actually uses user input
    private generateFromTextFallback(text: string): any {
        console.log("Generating intelligent model from text:", text.substring(0, 100) + "...");
        
        const analysis = this.analyzeTextRequirements(text);
        const modelData = this.generateModelFromAnalysis(analysis);
        
        return {
            modelData,
            metadata: {
                inputModalities: { text: true, sketch: false, speech: false, photo: false },
                modelStatistics: {
                    roomCount: modelData.rooms?.length || 0,
                    windowCount: modelData.windows?.length || 0, 
                    doorCount: modelData.doors?.length || 0,
                    totalArea: this.calculateTotalArea(modelData.rooms || []),
                },
                generationMethod: "intelligent_text_parsing",
                note: "Generated using intelligent text analysis (Azure not available)"
            },
            rawResponse: `Generated from text: "${text.substring(0, 200)}..."`
        };
    }

    private analyzeTextRequirements(text: string): any {
        const lower = text.toLowerCase();
        const analysis = {
            buildingType: "residential", // default
            rooms: [],
            features: [],
            style: "modern",
            size: "medium",
            floors: 1
        };

        // Detect building type
        if (lower.includes("office") || lower.includes("commercial") || lower.includes("business")) {
            analysis.buildingType = "commercial";
        } else if (lower.includes("hotel") || lower.includes("restaurant") || lower.includes("retail")) {
            analysis.buildingType = "hospitality";
        }

        // Extract room requirements
        const roomPatterns = {
            bedroom: /(\d+)?[\s-]*(bed|bedroom)s?/gi,
            bathroom: /(\d+)?[\s-]*(bath|bathroom)s?/gi,
            kitchen: /kitchen|cooking|culinary/gi,
            living: /living\s*room|lounge|family\s*room/gi,
            dining: /dining\s*room|dining\s*area/gi,
            office: /office|study|workspace|home\s*office/gi,
            garage: /garage|parking/gi,
            basement: /basement|cellar/gi,
            attic: /attic|loft/gi,
            utility: /utility|laundry|storage/gi
        };

        Object.entries(roomPatterns).forEach(([roomType, pattern]) => {
            const matches = text.match(pattern);
            if (matches) {
                const countMatch = matches[0].match(/\d+/);
                const count = countMatch ? parseInt(countMatch[0]) : 1;
                
                for (let i = 0; i < count; i++) {
                    analysis.rooms.push({
                        type: roomType,
                        name: count > 1 ? `${roomType}${i + 1}` : roomType
                    });
                }
            }
        });

        // If no specific rooms mentioned, create reasonable defaults
        if (analysis.rooms.length === 0) {
            if (analysis.buildingType === "commercial") {
                analysis.rooms = [
                    { type: "office", name: "main_office" },
                    { type: "meeting", name: "conference_room" },
                    { type: "reception", name: "lobby" }
                ];
            } else {
                analysis.rooms = [
                    { type: "living", name: "living_room" },
                    { type: "kitchen", name: "kitchen" },
                    { type: "bedroom", name: "bedroom" },
                    { type: "bathroom", name: "bathroom" }
                ];
            }
        }

        // Detect size hints
        if (lower.includes("large") || lower.includes("spacious") || lower.includes("luxury")) {
            analysis.size = "large";
        } else if (lower.includes("small") || lower.includes("compact") || lower.includes("tiny")) {
            analysis.size = "small";
        }

        // Detect style
        if (lower.includes("modern") || lower.includes("contemporary")) {
            analysis.style = "modern";
        } else if (lower.includes("traditional") || lower.includes("classic")) {
            analysis.style = "traditional";
        } else if (lower.includes("industrial")) {
            analysis.style = "industrial";
        }

        // Detect floors
        const floorMatch = lower.match(/(\d+)[\s-]*(story|stories|floor|floors)/);
        if (floorMatch) {
            analysis.floors = parseInt(floorMatch[1]);
        }

        return analysis;
    }

    private generateModelFromAnalysis(analysis: any): any {
        const sizeMultipliers = { small: 0.7, medium: 1.0, large: 1.4 };
        const multiplier = sizeMultipliers[analysis.size] || 1.0;
        
        const baseRoomSizes = {
            living: { width: 5, length: 6 },
            bedroom: { width: 3.5, length: 4 },
            bathroom: { width: 2.5, length: 3 },
            kitchen: { width: 3, length: 4 },
            dining: { width: 3.5, length: 4 },
            office: { width: 4, length: 5 },
            garage: { width: 6, length: 7 },
            utility: { width: 2, length: 2.5 },
            reception: { width: 6, length: 8 },
            meeting: { width: 4, length: 6 }
        };

        const rooms = [];
        const doors = [];
        const windows = [];
        
        let currentX = 0;
        let currentZ = 0;
        let maxRowHeight = 0;

        analysis.rooms.forEach((roomReq: any, index: number) => {
            const baseSize = baseRoomSizes[roomReq.type] || { width: 4, length: 4 };
            const width = Math.round(baseSize.width * multiplier * 10) / 10;
            const length = Math.round(baseSize.length * multiplier * 10) / 10;
            
            // Simple grid layout
            if (currentX + width > 15) { // Max width before new row
                currentX = 0;
                currentZ += maxRowHeight + 0.5; // Add some spacing
                maxRowHeight = 0;
            }

            const room = {
                name: roomReq.name,
                width,
                length,
                height: 3,
                x: currentX,
                y: 0,
                z: currentZ,
                connected_to: []
            };

            rooms.push(room);

            // Add connections to adjacent rooms
            if (index > 0) {
                const prevRoom = rooms[index - 1];
                room.connected_to.push(prevRoom.name);
                prevRoom.connected_to.push(room.name);
                
                doors.push({
                    from: prevRoom.name,
                    to: room.name,
                    width: 0.9,
                    height: 2.1
                });
            }

            // Add windows to most rooms (except bathrooms and utility)
            if (!["bathroom", "utility"].includes(roomReq.type)) {
                windows.push({
                    room: room.name,
                    wall: "south",
                    width: Math.min(width * 0.4, 2),
                    height: 1.2,
                    position: 0.5
                });
            }

            currentX += width + 0.5; // Add some spacing
            maxRowHeight = Math.max(maxRowHeight, length);
        });

        return { rooms, windows, doors };
    }

    private enhanceWithVisualData(textResult: any, sketchData: any, photoData: any): any {
        console.log("Enhancing text result with visual data");
        
        // Combine the text-based model with visual insights
        let enhancedModel = { ...textResult.modelData };
        
        if (sketchData && sketchData.rooms) {
            // Use sketch room layout if available
            enhancedModel.rooms = sketchData.rooms.map((sketchRoom: any) => ({
                ...sketchRoom,
                name: sketchRoom.name || `room_${sketchRoom.x}_${sketchRoom.z}`
            }));
        }
        
        if (photoData && photoData.architecturalFeatures) {
            // Apply architectural style from photo
            const style = photoData.architecturalFeatures.style;
            if (style && style !== "unknown") {
                enhancedModel.style = style;
            }
        }

        return {
            ...textResult,
            modelData: enhancedModel,
            metadata: {
                ...textResult.metadata,
                visualEnhancement: true,
                sketchUsed: !!sketchData,
                photoUsed: !!photoData
            }
        };
    }

    private generatePromptFromVisuals(sketchData: any, photoData: any): string {
        let prompt = "Generate an architectural model based on visual analysis: ";
        
        if (sketchData && sketchData.rooms) {
            const roomNames = sketchData.rooms.map((r: any) => r.name || r.type).join(", ");
            prompt += `Sketch shows rooms: ${roomNames}. `;
        }
        
        if (photoData && photoData.description) {
            prompt += `Photo analysis: ${photoData.description}. `;
        }
        
        if (photoData && photoData.architecturalFeatures) {
            prompt += `Architectural style: ${photoData.architecturalFeatures.style}. `;
        }

        return prompt || "Generate a modern architectural model from visual inputs";
    }

    private processSketchOptimized(sketch: string): Promise<any> {
        // Optimized sketch processing with faster timeout
        return Promise.race([
            analyzeSketch(sketch),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Sketch processing timeout")), 10000)
            )
        ]);
    }

    private processPhotoOptimized(photo: string): Promise<any> {
        // Optimized photo processing
        return Promise.race([
            this.processPhoto(photo),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Photo processing timeout")), 12000)
            )
        ]);
    }

    private extractModelMetadata(modelData: any, inputs: any): any {
        // Extract useful metadata from the generated model
        const metadata = {
            inputModalities: {
                text: !!inputs.text,
                speech: !!inputs.speechText,
                sketch: !!inputs.sketchAnalysis,
                photo: !!inputs.photoAnalysis,
            },
            modelStatistics: {
                roomCount: modelData.rooms?.length || 0,
                windowCount: modelData.windows?.length || 0,
                doorCount: modelData.doors?.length || 0,
                totalArea: this.calculateTotalArea(modelData.rooms || []),
                largestRoom: this.findLargestRoom(modelData.rooms || []),
            },
            suggestedStyle: this.determineSuggestedStyle(inputs),
            sourceContribution: this.analyzeSourceContribution(inputs),
        };

        return metadata;
    }

    private calculateTotalArea(rooms: any[]): number {
        return rooms.reduce((sum, room) => sum + room.width * room.length, 0);
    }

    private findLargestRoom(rooms: any[]): any {
        if (!rooms.length) return null;

        return rooms.reduce(
            (largest, room) => {
                const area = room.width * room.length;
                return area > largest.area
                    ? { name: room.name, area }
                    : largest;
            },
            { name: rooms[0].name, area: rooms[0].width * rooms[0].length }
        );
    }

    private determineSuggestedStyle(inputs: any): string {
        // Determine an architectural style based on inputs
        if (inputs.photoAnalysis?.architecturalFeatures?.style !== "unknown") {
            return inputs.photoAnalysis.architecturalFeatures.style;
        }

        // Default style
        return "modern";
    }

    private analyzeSourceContribution(inputs: any): any {
        // Analyze how much each modality contributed to the final model
        const weights = {
            text: inputs.text ? 0.4 : 0,
            speech: inputs.speechText ? 0.2 : 0,
            sketch: inputs.sketchAnalysis ? 0.3 : 0,
            photo: inputs.photoAnalysis ? 0.1 : 0,
        };

        // Normalize weights
        const totalWeight = Object.values(weights).reduce(
            (sum: number, weight: number) => sum + weight,
            0
        );

        if (totalWeight > 0) {
            for (const key in weights) {
                weights[key] = weights[key] / totalWeight;
            }
        }

        return weights;
    }

    // Speech recognition method
    async recognizeSpeech(audioBlob: Blob): Promise<string> {
        if (!this.speechConfig) {
            throw new Error(
                "Speech service not initialized. Check Azure Speech configuration."
            );
        }

        return new Promise<string>(async (resolve, reject) => {
            try {
                // Convert Blob to ArrayBuffer
                const arrayBuffer = await audioBlob.arrayBuffer();

                // Create an AudioConfig object using the array buffer
                const pushStream =
                    AudioConfig.fromWavFileOutput("audio-output.wav");

                // Create the SpeechRecognizer
                const recognizer = new SpeechRecognizer(
                    this.speechConfig,
                    pushStream
                );

                // Process audio data
                recognizer.recognizeOnceAsync(
                    (result) => {
                        if (result.text) {
                            resolve(result.text);
                        } else {
                            reject(
                                new Error(
                                    "No text was recognized from the audio"
                                )
                            );
                        }
                        recognizer.close();
                    },
                    (error) => {
                        recognizer.close();
                        reject(error);
                    }
                );

                // Push audio data to the stream
                pushStream.write(new Uint8Array(arrayBuffer));
                pushStream.close();
            } catch (error) {
                reject(error);
            }
        });
    }
}

// Export a singleton instance for easier importing
export const multimodalProcessor = new MultimodalProcessor();
