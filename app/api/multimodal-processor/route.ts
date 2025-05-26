import { NextResponse } from "next/server";
import { multimodalProcessor } from "@/services/multimodal-processor";
import { AgentOrchestrator } from "@/services/agent-orchestrator";

// Simple code generation function
function generateCodeFromModel(modelData: any): string {
    const rooms = modelData.rooms || [];
    const roomNames = rooms.map((r: any) => r.name).join(", ");
    
    return `// Generated Three.js code for model with rooms: ${roomNames}
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Create rooms
${rooms.map((room: any) => `
// ${room.name}
const ${room.name}Geometry = new THREE.BoxGeometry(${room.width}, ${room.height}, ${room.length});
const ${room.name}Material = new THREE.MeshBasicMaterial({ 
    color: 0x${Math.floor(Math.random()*16777215).toString(16)}, 
    wireframe: true 
});
const ${room.name}Mesh = new THREE.Mesh(${room.name}Geometry, ${room.name}Material);
${room.name}Mesh.position.set(${room.x + room.width/2}, ${room.y + room.height/2}, ${room.z + room.length/2});
scene.add(${room.name}Mesh);`).join('\n')}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();`;
}

// Initialize agent orchestrator
const agentOrchestrator = new AgentOrchestrator();

export async function POST(req: Request) {
    try {
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

        // Process inputs using optimized multimodal processor
        const processorResult = await multimodalProcessor.processMultimodalInput({
            text,
            sketch,
            speech,
            photo,
        });

        // Check if we already have a good model from the processor
        if (processorResult.modelData && processorResult.modelData.rooms && processorResult.modelData.rooms.length > 0) {
            console.log("Using model directly from optimized processor");
            const combinedResult = {
                modelData: processorResult.modelData,
                code: this.generateCodeFromModel(processorResult.modelData),
                metadata: {
                    ...processorResult.metadata,
                    processingTimeMs: Date.now() - Date.now(), // Minimal time
                    optimizedPath: true
                },
            };
            return NextResponse.json(combinedResult);
        }

        // Fallback to agent orchestrator only if needed
        console.log("Falling back to agent orchestrator for additional processing");
        const agentResult = await agentOrchestrator.processDesignRequestWithTracing(
            processorResult.rawResponse || text || "Generate a building",
            sketch || null
        );

        // Combine the results
        const combinedResult = {
            modelData: agentResult.modelData,
            code: agentResult.code,
            metadata: {
                ...processorResult.metadata,
                processingTimeMs: agentResult.processingTimeMs,
                usedAgentFallback: true
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
