import { AgentOrchestrator } from "./agent-orchestrator";
import { multimodalProcessor } from "./multimodal-processor";
// Keep existing imports

// Initialize the agent orchestrator
const agentOrchestrator = new AgentOrchestrator();

/**
 * Enhanced function to generate a CAD model from text prompt and/or sketch data
 * Now supporting multimodal inputs
 */
export async function generateCadModel(
    prompt: string,
    sketchData?: string | null,
    speechData?: string | null,
    photoData?: string | null
) {
    try {
        console.log(`Generating CAD model with multimodal inputs:
      - Text prompt: ${prompt ? "provided" : "none"}
      - Sketch data: ${sketchData ? "provided" : "none"}
      - Speech data: ${speechData ? "provided" : "none"}
      - Photo data: ${photoData ? "provided" : "none"}`);

        // If we have any multimodal inputs (sketch, speech, or photo), use the multimodal processor
        if (sketchData || speechData || photoData) {
            console.log("Using multimodal processor for non-text inputs");

            // Process multiple input modalities
            const processorResult =
                await multimodalProcessor.processMultimodalInput({
                    text: prompt,
                    sketch: sketchData || undefined,
                    speech: speechData || undefined,
                    photo: photoData || undefined,
                });

            // Use the extracted model directly if valid
            if (processorResult.modelData && processorResult.modelData.rooms) {
                return {
                    modelData: processorResult.modelData,
                    code: processorResult.code || generateMockCode(prompt),
                    metadata: processorResult.metadata,
                };
            }

            // If no valid model was extracted, continue with the agent orchestrator
            prompt = processorResult.rawResponse || prompt;
        }

        // For single-modality inputs or as a fallback, use the agent orchestrator
        const result = await agentOrchestrator.processDesignRequest(
            prompt,
            sketchData
        );

        // Return the processed result
        return {
            modelData: result.modelData,
            code: result.code,
            metadata: {
                inputModalities: {
                    text: !!prompt,
                    sketch: !!sketchData,
                    speech: !!speechData,
                    photo: !!photoData,
                },
            },
        };
    } catch (error) {
        console.error("Error in enhanced generateCadModel:", error);

        // Use fallback method if processing fails
        console.log("Using fallback model generation...");
        return generateFallbackCadModel(prompt, sketchData);
    }
}

// Make sure to keep your existing fallback methods below
// Your existing generateFallbackCadModel implementation should be here
// If it's not in this file, you need to import it

// If you need to implement it, here's a simple version:
function generateFallbackCadModel(prompt: string, sketchData?: string | null) {
    // This is a simple implementation - replace with your actual implementation
    return {
        modelData: {
            rooms: [
                {
                    name: "living",
                    width: 5,
                    length: 7,
                    height: 3,
                    x: 0,
                    y: 0,
                    z: 0,
                    connected_to: ["kitchen", "hallway"],
                },
                {
                    name: "kitchen",
                    width: 4,
                    length: 4,
                    height: 3,
                    x: 5,
                    y: 0,
                    z: 0,
                    connected_to: ["living"],
                },
            ],
            windows: [
                {
                    room: "living",
                    wall: "south",
                    width: 2,
                    height: 1.5,
                    position: 0.5,
                },
            ],
            doors: [{ from: "living", to: "kitchen", width: 1.2, height: 2.1 }],
        },
        code: generateMockCode(prompt),
        metadata: {
            inputModalities: {
                text: !!prompt,
                sketch: !!sketchData,
                speech: false,
                photo: false,
            },
            note: "Fallback model generated due to processing error",
        },
    };
}

// Make sure you also have the generateMockCode function
function generateMockCode(prompt: string): string {
    // This is a simple implementation - replace with your actual implementation
    return `// Generated Three.js code for: "${prompt || "Fallback model"}"
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Initialize scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Initialize camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);

// Basic renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create living room
createRoom("living", 5, 7, 3, 0, 0, 0);
// Create kitchen
createRoom("kitchen", 4, 4, 3, 5, 0, 0);

// Room creation function
function createRoom(name, width, length, height, x, y, z) {
  const geometry = new THREE.BoxGeometry(width, height, length);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  const wireframe = new THREE.LineSegments(edges, material);
  wireframe.position.set(x + width/2, y + height/2, z + length/2);
  scene.add(wireframe);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();`;
}
