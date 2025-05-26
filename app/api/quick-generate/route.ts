import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt } = body;

        // Quick fallback generation without heavy processing
        const quickModel = generateQuickModel(prompt || "Simple house");

        return NextResponse.json({
            modelData: quickModel,
            code: generateQuickCode(),
            metadata: {
                type: "quick_generation",
                processingTimeMs: 100,
                note: "Generated using quick fallback method"
            }
        });
    } catch (error) {
        console.error("Quick generation error:", error);
        return NextResponse.json(
            { error: "Quick generation failed" },
            { status: 500 }
        );
    }
}

function generateQuickModel(prompt: string) {
    return {
        rooms: [
            {
                name: "living_room",
                width: 6,
                length: 8,
                height: 3,
                x: 0,
                y: 0,
                z: 0,
                connected_to: ["kitchen"]
            },
            {
                name: "kitchen", 
                width: 4,
                length: 6,
                height: 3,
                x: 6,
                y: 0,
                z: 0,
                connected_to: ["living_room"]
            }
        ],
        windows: [
            {
                room: "living_room",
                wall: "south",
                width: 2,
                height: 1.5,
                position: 0.5
            }
        ],
        doors: [
            {
                from: "living_room",
                to: "kitchen",
                width: 1.0,
                height: 2.1
            }
        ]
    };
}

function generateQuickCode() {
    return `// Quick-generated Three.js code
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Create simple room geometry
const roomGeometry = new THREE.BoxGeometry(6, 3, 8);
const roomMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true });
const room = new THREE.Mesh(roomGeometry, roomMaterial);
scene.add(room);

camera.position.set(10, 5, 10);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();`;
}