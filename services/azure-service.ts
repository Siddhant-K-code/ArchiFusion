import { AzureOpenAI } from "openai";
import { AzureKeyCredential } from "@azure/core-auth";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";

// Azure OpenAI Configuration
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4";
const AZURE_OPENAI_API_VERSION =
    process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview";

// Azure Computer Vision Configuration
const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY || "";
const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "";

/**
 * Analyzes a sketch image using Azure Computer Vision and extracts spatial information
 */
export async function analyzeSketch(sketchDataUrl: string) {
    try {
        // Remove the data URL prefix to get the base64 content
        const base64Image = sketchDataUrl.replace(
            /^data:image\/\w+;base64,/,
            ""
        );

        // Create Computer Vision client
        const credentials = new ApiKeyCredentials({
            inHeader: { "Ocp-Apim-Subscription-Key": AZURE_VISION_KEY },
        });
        const client = new ComputerVisionClient(
            credentials,
            AZURE_VISION_ENDPOINT
        );

        // Analyze the image with string literals for feature types
        // This avoids the import issues with VisualFeatureTypes
        const result = await client.analyzeImageInStream(
            Buffer.from(base64Image, "base64"),
            {
                visualFeatures: ["Objects", "Categories", "Tags", "Lines"],
            }
        );

        // Extract useful information from the analysis
        const processedResult = {
            objects: result.objects || [],
            tags: result.tags || [],
            categories: result.categories || [],
            lines: result.lines || [],
            derivedLines: extractLinesFromObjects(result.objects || []),
            detectedRooms: detectPotentialRooms(result),
        };

        return processedResult;
    } catch (error) {
        console.error("Error analyzing sketch:", error);
        throw new Error(
            `Failed to analyze sketch: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

/**
 * Extract potential rooms from the Computer Vision analysis
 */
function detectPotentialRooms(result: any) {
    // This function analyzes the detected objects and lines to identify potential rooms
    // It looks for enclosed spaces that could represent rooms

    const potentialRooms = [];

    // Look for rectangle or square objects that might represent rooms
    const objects = result.objects || [];
    const rectangles = objects.filter(
        (obj) =>
            obj.object === "rectangle" ||
            obj.object === "square" ||
            obj.object === "shape"
    );

    // Convert rectangles to potential rooms
    rectangles.forEach((rect, index) => {
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

    // Try to detect rooms from line intersections
    // This is a simplified approach - a more sophisticated algorithm would be needed
    // for accurate room detection from arbitrary lines
    const lines = result.lines || [];
    if (lines && lines.length > 0) {
        // Group lines by orientation (horizontal/vertical)
        const horizontalLines = lines.filter(
            (line: any) =>
                Math.abs(line.y1 - line.y2) < Math.abs(line.x1 - line.x2)
        );
        const verticalLines = lines.filter(
            (line: any) =>
                Math.abs(line.y1 - line.y2) >= Math.abs(line.x1 - line.x2)
        );

        // Find intersections that could form corners of rooms
        // This is a simplified approach - in reality we would need more sophisticated
        // algorithms to detect closed polygons representing rooms
        if (horizontalLines.length > 0 && verticalLines.length > 0) {
            // Add a potential room based on the overall sketch bounds
            // This helps when the sketch doesn't have clear room boundaries
            const allX = lines.flatMap((l: any) => [l.x1, l.x2]);
            const allY = lines.flatMap((l: any) => [l.y1, l.y2]);

            const minX = Math.min(...allX);
            const maxX = Math.max(...allX);
            const minY = Math.min(...allY);
            const maxY = Math.max(...allY);

            // Add an overall room if no specific rooms were detected
            if (potentialRooms.length === 0) {
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
    }

    return potentialRooms;
}

/**
 * Extracts line information from detected objects
 */
function extractLinesFromObjects(objects: any[]) {
    const lines = [];

    // Process each object's bounding box to extract potential lines
    for (const obj of objects) {
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

/**
 * Generates a CAD model from a sketch analysis and/or text prompt using Azure OpenAI
 */
export async function generateModelFromSketch(
    sketchAnalysis: any,
    textPrompt: string = ""
) {
    try {
        // Initialize Azure OpenAI client
        const client = new AzureOpenAI({
            apiKey: AZURE_OPENAI_KEY,
            apiVersion: AZURE_OPENAI_API_VERSION,
            endpoint: AZURE_OPENAI_ENDPOINT,
        });

        // Prepare system message with the expected output format - enhanced for multiple rooms
        const systemMessage = `
    You are an architectural AI system that converts sketches or text descriptions into 3D models. 
    Analyze the provided sketch data and/or text description and generate a structured JSON object with:
    1. Rooms: Define dimensions, positions, and connections between rooms
    2. Windows: Specify which walls have windows, their dimensions and positions
    3. Doors: Define connections between rooms
    
    IMPORTANT: If sketch data is provided, create multiple rooms based on the detected shapes, lines, and 
    potential rooms in the sketch. Don't collapse everything into a single room. Each detected rectangle, 
    enclosed area, or potential room in the sketch should be interpreted as a separate room.
    
    Ensure that rooms have appropriate dimensions (non-zero width, length, height) and are properly positioned
    in 3D space to reflect their relative positions in the sketch.
    
    Your output should be ONLY a valid JSON object with this structure:
    {
      "rooms": [
        {
          "name": "string",
          "width": number,
          "length": number,
          "height": number,
          "x": number,
          "y": number,
          "z": number,
          "connected_to": ["string"]
        }
      ],
      "windows": [
        {
          "room": "string",
          "wall": "north|south|east|west",
          "width": number,
          "height": number,
          "position": number (0-1 representing position along the wall)
        }
      ],
      "doors": [
        {
          "from": "string",
          "to": "string",
          "width": number,
          "height": number
        }
      ]
    }
    `;

        // Prepare the sketch analysis and prompt for the OpenAI request with emphasis on multiple rooms
        const userMessage = `
    ${textPrompt ? `Text Description: ${textPrompt}\n\n` : ""}
    ${
        sketchAnalysis
            ? `Sketch Analysis: ${JSON.stringify(sketchAnalysis, null, 2)}`
            : ""
    }
    
    Generate a complete architectural 3D model based on the information above.
    IMPORTANT: Create multiple separate rooms based on the sketch analysis.
    Each potential room, rectangle, or enclosed area in the sketch should be interpreted as a separate room.
    Position the rooms correctly in 3D space to match their relative positions in the 2D sketch.
    Add appropriate doors between adjacent rooms. For rooms that aren't adjacent but should be connected,
    add a door anyway and the visualization will show a connection line.
    `;

        // Call Azure OpenAI with a higher temperature to encourage creativity and variation
        const result = await client.chat.completions.create({
            model: AZURE_OPENAI_DEPLOYMENT,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage },
            ],
            temperature: 0.7, // Increased to allow more creative interpretations
            max_tokens: 4000, // Increased token count for more detailed responses
        });

        // Parse the response
        const content = result.choices[0].message?.content || "";

        // Extract JSON from response (in case there's any additional text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error(
                "Failed to extract valid JSON from the model response"
            );
        }

        const modelData = JSON.parse(jsonMatch[0]);

        // Simple validation to ensure we got multiple rooms when sketch has multiple potential rooms
        if (
            sketchAnalysis &&
            sketchAnalysis.detectedRooms &&
            sketchAnalysis.detectedRooms.length > 1 &&
            modelData.rooms &&
            modelData.rooms.length === 1
        ) {
            // If we have multiple potential rooms but only got one room in the result,
            // try again with an even stronger emphasis on multiple rooms

            const retryMessage = `
            ${userMessage}
            
            ERROR: Your previous response only included a single room, but the sketch clearly shows multiple rooms or areas.
            PLEASE CREATE MULTIPLE SEPARATE ROOMS in your response - at least ${sketchAnalysis.detectedRooms.length} rooms.
            The visualization needs separate room objects to display a proper multi-room floor plan.
            `;

            const retryResult = await client.chat.completions.create({
                model: AZURE_OPENAI_DEPLOYMENT,
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: retryMessage },
                ],
                temperature: 0.8, // Even higher temperature for more variation
                max_tokens: 4000,
            });

            const retryContent = retryResult.choices[0].message?.content || "";
            const retryJsonMatch = retryContent.match(/\{[\s\S]*\}/);

            if (retryJsonMatch) {
                const retryData = JSON.parse(retryJsonMatch[0]);
                // Only use the retry data if it actually has multiple rooms
                if (retryData.rooms && retryData.rooms.length > 1) {
                    return retryData;
                }
            }
        }

        return modelData;
    } catch (error) {
        console.error("Error generating model from sketch:", error);
        throw new Error(
            `Failed to generate model: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

/**
 * Generates Three.js code for the given 3D model data
 */
export async function generateThreeJsCode(modelData: any, prompt: string = "") {
    try {
        // Initialize Azure OpenAI client
        const client = new AzureOpenAI({
            apiKey: AZURE_OPENAI_KEY,
            apiVersion: AZURE_OPENAI_API_VERSION,
            endpoint: AZURE_OPENAI_ENDPOINT,
        });

        // Prepare system message with improved sketch focus and support for multiple rooms
        const systemMessage = `
    You are an expert Three.js developer. Generate clean, well-structured Three.js code to render a 3D CAD model 
    based on the provided model data. The code should:
    
    1. Initialize a scene, camera, and renderer
    2. Create rooms with floors and transparent walls
    3. Add doors and windows in the correct positions
    4. Include orbit controls for navigation
    5. Add appropriate lighting
    6. Handle window resizing
    7. Ensure multiple rooms are rendered correctly when present in the data
    8. Use different colors for different rooms to make them visually distinct
    
    Your code should be complete, runnable, and properly commented.
    `;

        // Prepare the model data for the OpenAI request with emphasis on multiple rooms
        const userMessage = `
    Original prompt: ${prompt}
    
    Model data: ${JSON.stringify(modelData, null, 2)}
    
    Generate Three.js code to render this 3D model with all rooms, doors, and windows.
    Be sure to accurately represent the spatial relationships between all rooms.
    Use different colors for different rooms to make them visually distinct.
    Handle cases where rooms may not be directly adjacent but are still connected by doors.
    `;

        // Call Azure OpenAI
        const result = await client.chat.completions.create({
            model: AZURE_OPENAI_DEPLOYMENT,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage },
            ],
            temperature: 0.1,
            max_tokens: 4000, // Increased token limit for more detailed code
        });

        // Get the code from the response
        const code = result.choices[0].message?.content || "";

        return code;
    } catch (error) {
        console.error("Error generating Three.js code:", error);
        throw new Error(
            `Failed to generate code: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}
