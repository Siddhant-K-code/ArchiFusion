"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

// Add these new interfaces to your existing interfaces
interface RoomLabelStyle {
    showRoomNumbers: boolean;
    showRoomNames: boolean;
    showRoomAreas: boolean;
    labelPlacement: "centered" | "floor" | "ceiling";
    labelSize: number;
}

interface ArchitecturalSettings {
    colorMode: "functional" | "technical" | "presentation";
    showRoomTags: boolean;
    roomLabelStyle: RoomLabelStyle;
    displayStandard: "metric" | "imperial";
    showDimensions: boolean;
}

interface ModelData {
    rooms: {
        name: string;
        width: number;
        length: number;
        height: number;
        x: number;
        y: number;
        z: number;
        connected_to: string[];
        type?: string; // Optional type for room rendering customization
    }[];
    windows: {
        room: string;
        wall: string;
        width: number;
        height: number;
        position: number;
    }[];
    doors: {
        from: string;
        to: string;
        width: number;
        height: number;
    }[];
}

interface ViewerSettings {
    showGrid: boolean;
    showAxes: boolean;
    backgroundColor: string;
    lighting: string;
    wireframe: boolean;
    zoom: number;
    showMeasurements: boolean; // Added for showing measurements
    roomLabels: boolean; // Added for toggling room labels
}

// Add these new interfaces to your existing interfaces
interface RoomLabelStyle {
    showRoomNumbers: boolean;
    showRoomNames: boolean;
    showRoomAreas: boolean;
    labelPlacement: "centered" | "floor" | "ceiling";
    labelSize: number;
}

interface ArchitecturalSettings {
    colorMode: "functional" | "technical" | "presentation";
    showRoomTags: boolean;
    roomLabelStyle: RoomLabelStyle;
    displayStandard: "metric" | "imperial";
    showDimensions: boolean;
}

export function CadModelViewer({
    modelData,
    settings,
}: {
    modelData: ModelData;
    settings: ViewerSettings;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [roomCount, setRoomCount] = useState(0);
    const [validRoomCount, setValidRoomCount] = useState(0);
    const [gridSize, setGridSize] = useState(20);
    const [font, setFont] = useState<Font | null>(null);

    // Utility function to safely create canvas elements
    const createCanvas = () => {
        if (typeof document === "undefined") return null;
        return document.createElement("canvas");
    };

    // Initialize the scene
    useEffect(() => {
        if (!containerRef.current || !modelData) {
            console.log("Container or model data not available");
            return;
        }

        setIsLoading(true);
        setError(null);

        console.log("Initializing 3D viewer with model data:", modelData);

        // Count total rooms and valid rooms
        setRoomCount(modelData.rooms.length);
        const validRooms = modelData.rooms.filter(
            (room) => room.width > 0 && room.length > 0 && room.height > 0
        );
        setValidRoomCount(validRooms.length);

        console.log(
            `Room count: ${modelData.rooms.length}, Valid rooms: ${validRooms.length}`
        );

        // Load font for text labels
        const fontLoader = new FontLoader();
        let loadedFont: Font | null = null;

        // We'll use fontLoader in the main code, but we need to handle the case
        // where the font is not yet loaded. We'll use a simple sans-serif font initially.

        try {
            // Clear any existing content
            while (containerRef.current.firstChild) {
                containerRef.current.removeChild(
                    containerRef.current.firstChild
                );
            }

            // Calculate model bounds to determine grid size
            const modelBounds = calculateModelBounds(modelData);
            const modelSize = Math.max(
                modelBounds.width,
                modelBounds.length,
                modelBounds.height
            );
            const calculatedGridSize = Math.ceil((modelSize * 1.5) / 5) * 5; // Round to nearest 5
            setGridSize(calculatedGridSize > 20 ? calculatedGridSize : 20);

            // Basic Three.js setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(settings.backgroundColor);

            const camera = new THREE.PerspectiveCamera(
                75,
                containerRef.current.clientWidth /
                    containerRef.current.clientHeight,
                0.1,
                1000
            );

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
            );
            containerRef.current.appendChild(renderer.domElement);

            // Add controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;

            // Enhanced grid with measurements
            if (settings.showGrid) {
                addEnhancedGrid(scene, gridSize, settings.showMeasurements);
            }

            // Enhanced axes helper with labels
            if (settings.showAxes) {
                addEnhancedAxes(scene, gridSize);
            }

            // Configure lighting based on settings
            let ambientIntensity = 1.5;
            let directionalIntensity = 0.5;
            let directionalPosition = new THREE.Vector3(10, 10, 10);

            switch (settings.lighting) {
                case "morning":
                    ambientIntensity = 1.2;
                    directionalIntensity = 0.4;
                    directionalPosition = new THREE.Vector3(10, 6, -10); // East
                    break;
                case "day":
                    ambientIntensity = 1.8;
                    directionalIntensity = 0.7;
                    directionalPosition = new THREE.Vector3(0, 15, 0); // Top
                    break;
                case "evening":
                    ambientIntensity = 1.0;
                    directionalIntensity = 0.3;
                    directionalPosition = new THREE.Vector3(-10, 6, -10); // West
                    scene.background = new THREE.Color(
                        settings.backgroundColor !== "#000000"
                            ? "#f8e8d8"
                            : "#000000"
                    );
                    break;
                case "night":
                    ambientIntensity = 0.6;
                    directionalIntensity = 0.1;
                    directionalPosition = new THREE.Vector3(0, 10, 0);
                    scene.background = new THREE.Color(
                        settings.backgroundColor !== "#000000"
                            ? "#1a1a2e"
                            : "#000000"
                    );
                    break;
            }

            // Add lighting
            const ambientLight = new THREE.AmbientLight(
                0x404040,
                ambientIntensity
            );
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(
                0xffffff,
                directionalIntensity
            );
            directionalLight.position.copy(directionalPosition);
            scene.add(directionalLight);

            // Add point lights for better room illumination
            addRoomLights(scene, modelData.rooms);

            // Create rooms
            const roomObjects: { [key: string]: THREE.Group } = {};
            const validatedRooms: string[] = [];

            modelData.rooms.forEach((room) => {
                // Skip invalid rooms (prevents rendering errors)
                if (room.width <= 0 || room.length <= 0 || room.height <= 0) {
                    console.warn(
                        `Skipping invalid room: ${room.name} with dimensions: ${room.width}x${room.height}x${room.length}`
                    );
                    return;
                }

                validatedRooms.push(room.name);

                console.log(
                    `Creating room: ${room.name} with dimensions: ${room.width}x${room.height}x${room.length} at position (${room.x}, ${room.y}, ${room.z})`
                );

                // Create a group for each room and its components
                const roomGroup = new THREE.Group();
                roomGroup.name = room.name;

                // Create room with transparent walls
                const roomGeometry = new THREE.BoxGeometry(
                    room.width,
                    room.height,
                    room.length
                );

                // Determine room color based on room type or name
                const roomColor = getRoomColor(room);

                const roomMaterial = new THREE.MeshStandardMaterial({
                    color: roomColor,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: settings.wireframe,
                    side: THREE.DoubleSide,
                });

                const roomMesh = new THREE.Mesh(roomGeometry, roomMaterial);
                roomMesh.position.set(
                    room.width / 2,
                    room.height / 2,
                    room.length / 2
                );

                // Add dimension measurements on room edges
                if (settings.showMeasurements) {
                    addRoomDimensions(roomGroup, room);
                }

                roomGroup.add(roomMesh);

                // Add room edges for better visibility
                const edges = new THREE.EdgesGeometry(roomGeometry);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0x000000,
                });
                const wireframe = new THREE.LineSegments(edges, lineMaterial);
                wireframe.position.copy(roomMesh.position);
                roomGroup.add(wireframe);

                // Add floor with appropriate material
                const floorGeometry = new THREE.PlaneGeometry(
                    room.width,
                    room.length
                );

                // Get specialized floor material based on room type
                const floorMaterial = getFloorMaterial(room);

                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.rotation.x = Math.PI / 2;
                floor.position.set(room.width / 2, 0.01, room.length / 2);

                roomGroup.add(floor);

                // Add specialized room features based on room type
                addSpecializedRoomFeatures(roomGroup, room);

                // Position the room group at the room's location
                roomGroup.position.set(room.x, room.y, room.z);
                scene.add(roomGroup);
                roomObjects[room.name] = roomGroup;

                // Add room label if enabled
                if (settings.roomLabels) {
                    createRoomLabel(scene, room);
                }
            });

            // Add windows
            modelData.windows.forEach((window) => {
                const roomGroup = roomObjects[window.room];

                if (!roomGroup) {
                    console.warn(`Room ${window.room} not found for window`);
                    return;
                }

                console.log(
                    `Creating window in ${window.room} on ${window.wall} wall`
                );

                const windowObj = createWindow(window);
                if (windowObj) {
                    roomGroup.add(windowObj);
                }
            });

            // Add doors
            modelData.doors.forEach((door) => {
                if (!door.from || !door.to) {
                    console.warn("Door missing from/to properties");
                    return;
                }

                const fromRoom = modelData.rooms.find(
                    (r) => r.name === door.from
                );
                const toRoom = modelData.rooms.find((r) => r.name === door.to);

                if (!fromRoom || !toRoom) {
                    console.warn(
                        `Rooms not found for door: ${door.from} -> ${door.to}`
                    );
                    return;
                }

                // Skip doors for invalid rooms
                if (
                    !validatedRooms.includes(door.from) ||
                    !validatedRooms.includes(door.to)
                ) {
                    console.warn(
                        `Skipping door between invalid rooms: ${door.from} -> ${door.to}`
                    );
                    return;
                }

                console.log(
                    `Creating door between ${door.from} and ${door.to}`
                );

                const doorObj = createDoor(door, fromRoom, toRoom);
                if (doorObj) {
                    scene.add(doorObj);
                }
            });

            // Position camera to view the entire scene
            const bbox = new THREE.Box3();
            scene.traverse((object) => {
                if (
                    object instanceof THREE.Mesh ||
                    object instanceof THREE.Group
                ) {
                    bbox.expandByObject(object);
                }
            });

            const center = new THREE.Vector3();
            bbox.getCenter(center);

            const size = new THREE.Vector3();
            bbox.getSize(size);

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));

            // Apply zoom settings
            cameraDistance = cameraDistance / settings.zoom;

            // Position camera
            camera.position.set(
                center.x + cameraDistance * 0.7,
                center.y + cameraDistance * 0.7,
                center.z + cameraDistance * 0.7
            );

            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();

            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }

            animate();

            // Handle window resize
            function handleResize() {
                if (!containerRef.current) return;

                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;

                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }

            window.addEventListener("resize", handleResize);

            console.log("3D scene initialized successfully");
            setIsLoading(false);

            // Cleanup
            return () => {
                console.log("Cleaning up 3D scene");
                window.removeEventListener("resize", handleResize);
                scene.clear();
                renderer.dispose();
            };
        } catch (err) {
            console.error("Error initializing 3D viewer:", err);
            setError(
                `Error initializing 3D viewer: ${
                    err instanceof Error ? err.message : String(err)
                }`
            );
            setIsLoading(false);
        }
    }, [
        modelData,
        settings.backgroundColor,
        settings.showGrid,
        settings.showAxes,
        settings.wireframe,
        settings.lighting,
        settings.zoom,
        settings.showMeasurements,
        settings.roomLabels,
    ]);

    // Helper function to calculate model bounds
    function calculateModelBounds(modelData: ModelData) {
        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

        modelData.rooms.forEach((room) => {
            // Skip invalid rooms
            if (room.width <= 0 || room.length <= 0 || room.height <= 0) return;

            const x2 = room.x + room.width;
            const y2 = room.y + room.height;
            const z2 = room.z + room.length;

            minX = Math.min(minX, room.x);
            minY = Math.min(minY, room.y);
            minZ = Math.min(minZ, room.z);

            maxX = Math.max(maxX, x2);
            maxY = Math.max(maxY, y2);
            maxZ = Math.max(maxZ, z2);
        });

        // Return default values if no valid rooms
        if (minX === Infinity) return { width: 20, height: 3, length: 20 };

        return {
            width: maxX - minX,
            height: maxY - minY,
            length: maxZ - minZ,
        };
    }

    // Create enhanced grid with measurements
    function addEnhancedGrid(
        scene: THREE.Scene,
        size: number,
        showMeasurements: boolean
    ) {
        // Create main grid
        const gridHelper = new THREE.GridHelper(size, size, 0x666666, 0xcccccc);
        scene.add(gridHelper);

        // Add measurement labels if enabled
        if (showMeasurements) {
            // Create measurement labels at 5-meter intervals
            const interval = 5;
            const color = 0x333333;

            for (let i = -size / 2; i <= size / 2; i += interval) {
                if (i === 0) continue; // Skip zero

                // Create text sprites for measurements
                const xText = createTextSprite(`${i}m`, color);
                if (xText) {
                    xText.position.set(i, 0.1, 0);
                    scene.add(xText);
                }

                const zText = createTextSprite(`${i}m`, color);
                if (zText) {
                    zText.position.set(0, 0.1, i);
                    scene.add(zText);
                }
            }

            // Add origin marker
            const originMarker = createTextSprite("0", 0xff0000);
            if (originMarker) {
                originMarker.position.set(0, 0.1, 0);
                scene.add(originMarker);
            }
        }
    }

    // Create enhanced axes with labeled ends
    function addEnhancedAxes(scene: THREE.Scene, size: number) {
        // Create axes helper
        const axesHelper = new THREE.AxesHelper(size / 2);
        scene.add(axesHelper);

        // Add axis labels
        const axisLength = size / 2;

        const xLabel = createTextSprite("X", 0xff0000);
        if (xLabel) {
            xLabel.position.set(axisLength + 0.5, 0, 0);
            scene.add(xLabel);
        }

        const yLabel = createTextSprite("Y", 0x00ff00);
        if (yLabel) {
            yLabel.position.set(0, axisLength + 0.5, 0);
            scene.add(yLabel);
        }

        const zLabel = createTextSprite("Z", 0x0000ff);
        if (zLabel) {
            zLabel.position.set(0, 0, axisLength + 0.5);
            scene.add(zLabel);
        }
    }

    // Create a text sprite for labels
    function createTextSprite(message: string, color: number = 0xffffff) {
        const canvas = createCanvas();
        if (!canvas) return null;
        const context = canvas.getContext("2d");
        canvas.width = 128;
        canvas.height = 64;

        if (context) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = "24px Arial";
            context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(message, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
            });

            const sprite = new THREE.Sprite(material);
            sprite.scale.set(1, 0.5, 1);
            return sprite;
        }

        // Fallback empty sprite if context not available
        return new THREE.Sprite(new THREE.SpriteMaterial());
    }

    // Add dimensions to room edges
    function addRoomDimensions(
        roomGroup: THREE.Group,
        room: ModelData["rooms"][0]
    ) {
        // Add width dimension
        const widthLabel = createTextSprite(`${room.width}m`, 0x000000);
        if (widthLabel) {
            widthLabel.position.set(room.width / 2, room.height + 0.3, -0.5);
            roomGroup.add(widthLabel);
        }

        // Add length dimension
        const lengthLabel = createTextSprite(`${room.length}m`, 0x000000);
        if (lengthLabel) {
            lengthLabel.position.set(-0.5, room.height + 0.3, room.length / 2);
            roomGroup.add(lengthLabel);
        }

        // Add height dimension
        const heightLabel = createTextSprite(`${room.height}m`, 0x000000);
        if (heightLabel) {
            heightLabel.position.set(-0.5, room.height / 2, -0.5);
            roomGroup.add(heightLabel);
        }
    }

    // Create a room label
    function createRoomLabel(scene: THREE.Scene, room: ModelData["rooms"][0]) {
        const canvas = createCanvas();
        if (!canvas) return;
        const context = canvas.getContext("2d");
        canvas.width = 256;
        canvas.height = 64;

        if (context) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = "bold 24px Arial";
            context.fillStyle = "#000000";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(room.name, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
            });

            const label = new THREE.Sprite(labelMaterial);
            label.position.set(
                room.x + room.width / 2,
                room.y + room.height / 2,
                room.z + room.length / 2
            );
            label.scale.set(3, 0.75, 1);
            scene.add(label);
        }
    }

    // Create window with frame and glass
    function createWindow(
        windowData: ModelData["windows"][0]
    ): THREE.Group | null {
        const room = modelData.rooms.find((r) => r.name === windowData.room);
        if (!room) return null;

        const windowGroup = new THREE.Group();

        const windowGeometry = new THREE.PlaneGeometry(
            windowData.width,
            windowData.height
        );

        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });

        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

        // Position window based on wall
        switch (windowData.wall.toLowerCase()) {
            case "north":
                windowMesh.position.set(
                    room.width * windowData.position,
                    room.height / 2,
                    0.01
                );
                break;
            case "south":
                windowMesh.position.set(
                    room.width * windowData.position,
                    room.height / 2,
                    room.length - 0.01
                );
                windowMesh.rotation.y = Math.PI;
                break;
            case "east":
                windowMesh.position.set(
                    room.width - 0.01,
                    room.height / 2,
                    room.length * windowData.position
                );
                windowMesh.rotation.y = Math.PI / 2;
                break;
            case "west":
                windowMesh.position.set(
                    0.01,
                    room.height / 2,
                    room.length * windowData.position
                );
                windowMesh.rotation.y = -Math.PI / 2;
                break;
            default:
                console.warn(`Unknown wall: ${windowData.wall}`);
                return null;
        }

        windowGroup.add(windowMesh);

        // Add window frame
        const frameGeometry = new THREE.EdgesGeometry(windowGeometry);
        const frameMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
        });

        const windowFrame = new THREE.LineSegments(
            frameGeometry,
            frameMaterial
        );
        windowFrame.position.copy(windowMesh.position);
        windowFrame.rotation.copy(windowMesh.rotation);
        windowGroup.add(windowFrame);

        return windowGroup;
    }

    // Create door with proper positioning
    function createDoor(
        door: ModelData["doors"][0],
        fromRoom: ModelData["rooms"][0],
        toRoom: ModelData["rooms"][0]
    ): THREE.Group | null {
        const doorGroup = new THREE.Group();

        // Create basic door geometry
        const doorGeometry = new THREE.BoxGeometry(
            door.width,
            door.height,
            0.1
        );

        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
        });

        const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);

        // Try to find the correct position for the door
        let doorPositioned = false;

        // Check if rooms are adjacent on X axis
        if (
            (fromRoom.x + fromRoom.width === toRoom.x ||
                toRoom.x + toRoom.width === fromRoom.x) &&
            fromRoom.z < toRoom.z + toRoom.length &&
            toRoom.z < fromRoom.z + fromRoom.length
        ) {
            // Rooms are adjacent on X axis
            const sharedX =
                fromRoom.x + fromRoom.width === toRoom.x
                    ? fromRoom.x + fromRoom.width
                    : toRoom.x + toRoom.width;

            // Find overlap on Z axis
            const minZ = Math.max(fromRoom.z, toRoom.z);
            const maxZ = Math.min(
                fromRoom.z + fromRoom.length,
                toRoom.z + toRoom.length
            );
            const midZ = (minZ + maxZ) / 2;

            doorMesh.position.set(
                sharedX - 0.05,
                fromRoom.y + door.height / 2,
                midZ
            );
            doorMesh.rotation.y = Math.PI / 2;
            doorPositioned = true;
        }

        // Check if rooms are adjacent on Z axis
        if (
            !doorPositioned &&
            (fromRoom.z + fromRoom.length === toRoom.z ||
                toRoom.z + toRoom.length === fromRoom.z) &&
            fromRoom.x < toRoom.x + toRoom.width &&
            toRoom.x < fromRoom.x + fromRoom.width
        ) {
            // Rooms are adjacent on Z axis
            const sharedZ =
                fromRoom.z + fromRoom.length === toRoom.z
                    ? fromRoom.z + fromRoom.length
                    : toRoom.z + toRoom.length;

            // Find overlap on X axis
            const minX = Math.max(fromRoom.x, toRoom.x);
            const maxX = Math.min(
                fromRoom.x + fromRoom.width,
                toRoom.x + toRoom.width
            );
            const midX = (minX + maxX) / 2;

            doorMesh.position.set(
                midX,
                fromRoom.y + door.height / 2,
                sharedZ - 0.05
            );
            doorPositioned = true;
        }

        // If no shared wall found, create a connecting "hallway"
        if (!doorPositioned) {
            const fromCenter = new THREE.Vector3(
                fromRoom.x + fromRoom.width / 2,
                fromRoom.y,
                fromRoom.z + fromRoom.length / 2
            );

            const toCenter = new THREE.Vector3(
                toRoom.x + toRoom.width / 2,
                toRoom.y,
                toRoom.z + toRoom.length / 2
            );

            // Place door at the midpoint
            const midPoint = new THREE.Vector3()
                .addVectors(fromCenter, toCenter)
                .multiplyScalar(0.5);

            // Orient the door toward the longer dimension
            const dx = Math.abs(toCenter.x - fromCenter.x);
            const dz = Math.abs(toCenter.z - fromCenter.z);

            doorMesh.position.set(
                midPoint.x,
                fromRoom.y + door.height / 2,
                midPoint.z
            );

            if (dx > dz) {
                doorMesh.rotation.y = 0; // Orient along Z axis
            } else {
                doorMesh.rotation.y = Math.PI / 2; // Orient along X axis
            }

            // Create a visual connection (hallway) between non-adjacent rooms
            createConnection(
                doorGroup,
                fromRoom,
                toRoom,
                door.width,
                door.height
            );
        }

        doorGroup.add(doorMesh);

        // Add door frame
        const frameGeometry = new THREE.EdgesGeometry(doorGeometry);
        const frameMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
        });

        const doorFrame = new THREE.LineSegments(frameGeometry, frameMaterial);
        doorFrame.position.copy(doorMesh.position);
        doorFrame.rotation.copy(doorMesh.rotation);
        doorGroup.add(doorFrame);

        return doorGroup;
    }

    // Create a visual connection between non-adjacent rooms
    function createConnection(
        group: THREE.Group,
        fromRoom: ModelData["rooms"][0],
        toRoom: ModelData["rooms"][0],
        width: number,
        height: number
    ) {
        const fromCenter = new THREE.Vector3(
            fromRoom.x + fromRoom.width / 2,
            fromRoom.y,
            fromRoom.z + fromRoom.length / 2
        );

        const toCenter = new THREE.Vector3(
            toRoom.x + toRoom.width / 2,
            toRoom.y,
            toRoom.z + toRoom.length / 2
        );

        // Create a path between the centers
        const distance = fromCenter.distanceTo(toCenter);
        const direction = new THREE.Vector3()
            .subVectors(toCenter, fromCenter)
            .normalize();

        // Create a hall-like connection
        const hallGeometry = new THREE.BoxGeometry(
            direction.z !== 0 ? width : distance,
            height,
            direction.x !== 0 ? width : distance
        );

        const hallMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3,
        });

        const hall = new THREE.Mesh(hallGeometry, hallMaterial);

        // Position the hall
        const midPoint = new THREE.Vector3()
            .addVectors(fromCenter, toCenter)
            .multiplyScalar(0.5);

        hall.position.set(midPoint.x, fromRoom.y + height / 2, midPoint.z);

        // Rotate the hall to align with the connection direction
        if (Math.abs(direction.x) > Math.abs(direction.z)) {
            hall.rotation.y = 0;
        } else {
            hall.rotation.y = Math.PI / 2;
        }

        // Add hall edges
        const edges = new THREE.EdgesGeometry(hallGeometry);
        const linesMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
        });

        const wireframe = new THREE.LineSegments(edges, linesMaterial);
        wireframe.position.copy(hall.position);
        wireframe.rotation.copy(hall.rotation);

        group.add(hall);
        group.add(wireframe);
    }

    // Get room color based on room type or name
    function getRoomColor(room: ModelData["rooms"][0]): number {
        const roomName = room.name.toLowerCase();
        const roomType = room.type?.toLowerCase() || "";

        if (roomName.includes("kitchen") || roomType === "kitchen") {
            return 0x90ee90; // Light green
        } else if (roomName.includes("bath") || roomType === "bathroom") {
            return 0xadd8e6; // Light blue
        } else if (roomName.includes("bedroom") || roomType === "bedroom") {
            return 0xffb6c1; // Light pink
        } else if (roomName.includes("living") || roomType === "living") {
            return 0xffd700; // Gold
        } else if (roomName.includes("dining") || roomType === "dining") {
            return 0xffa500; // Orange
        } else if (roomName.includes("hallway") || roomType === "hallway") {
            return 0xe6e6fa; // Lavender
        } else if (roomName.includes("patio") || roomType === "patio") {
            return 0x98fb98; // Pale green
        } else if (roomName.includes("storage") || roomType === "storage") {
            return 0xd3d3d3; // Light gray
        } else if (roomName.includes("wic") || roomType === "closet") {
            return 0xdda0dd; // Plum
        }

        // Get a consistent color based on room name if no match
        const hashCode = room.name.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
        }, 0);

        const hue = (Math.abs(hashCode) % 360) / 360;
        return new THREE.Color().setHSL(hue, 0.5, 0.7).getHex();
    }

    // Get floor material based on room type
    function getFloorMaterial(room: ModelData["rooms"][0]): THREE.Material {
        const roomName = room.name.toLowerCase();
        const roomType = room.type?.toLowerCase() || "";

        // Choose floor color based on room type
        let floorColor = 0xeeeeee; // Default color

        if (roomName.includes("kitchen") || roomType === "kitchen") {
            floorColor = 0xe0e0e0; // Kitchen floor (tile-like)

            // Create a grid pattern for kitchen tiles
            const texture = createTileTexture(0xe0e0e0, 0xcccccc, 10);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("bath") || roomType === "bathroom") {
            floorColor = 0xd0f0f0; // Bathroom floor (tile-like)

            // Create a grid pattern for bathroom tiles
            const texture = createTileTexture(0xd0f0f0, 0xb0e0e0, 8);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("bedroom") || roomType === "bedroom") {
            floorColor = 0xf5e8dc; // Bedroom floor (wooden)

            // Create a wood-like pattern
            const texture = createWoodTexture(0xf5e8dc, 0xe8d0c0);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("living") || roomType === "living") {
            floorColor = 0xf0f0e0; // Living room floor

            // Create a carpet-like texture
            const texture = createCarpetTexture(0xf0f0e0);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("dining") || roomType === "dining") {
            floorColor = 0xf8e8d8; // Dining room floor

            // Create a wood-like pattern
            const texture = createWoodTexture(0xf8e8d8, 0xe8d0c0);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("hallway") || roomType === "hallway") {
            floorColor = 0xe8e8e8; // Hallway floor
        } else if (roomName.includes("patio") || roomType === "patio") {
            floorColor = 0xd2b48c; // Patio floor (sandstone/concrete)

            // Create a stone-like pattern
            const texture = createStoneTexture(0xd2b48c);

            return new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            });
        } else if (roomName.includes("storage") || roomType === "storage") {
            floorColor = 0xcccccc; // Storage floor (concrete-like)
        }

        // Default material if no special texture
        return new THREE.MeshStandardMaterial({
            color: floorColor,
            side: THREE.DoubleSide,
        });
    }

    // Create a tile texture
    function createTileTexture(
        color1: number,
        color2: number,
        gridSize: number
    ): THREE.Texture {
        const canvas = createCanvas();
        if (!canvas) return new THREE.Texture();
        canvas.width = 256;
        canvas.height = 256;

        const context = canvas.getContext("2d");
        if (!context) return new THREE.Texture();

        const tileSize = canvas.width / gridSize;

        // Draw the tile pattern
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const useColor = (x + y) % 2 === 0 ? color1 : color2;
                context.fillStyle = `#${useColor
                    .toString(16)
                    .padStart(6, "0")}`;
                context.fillRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );

                // Add grout lines
                context.strokeStyle = "#999999";
                context.lineWidth = 1;
                context.strokeRect(
                    x * tileSize,
                    y * tileSize,
                    tileSize,
                    tileSize
                );
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        return texture;
    }

    // Create a wood texture
    function createWoodTexture(
        baseColor: number,
        grainColor: number
    ): THREE.Texture {
        const canvas = createCanvas();
        if (!canvas) return new THREE.Texture();
        canvas.width = 512;
        canvas.height = 512;

        const context = canvas.getContext("2d");
        if (!context) return new THREE.Texture();

        // Fill with base color
        context.fillStyle = `#${baseColor.toString(16).padStart(6, "0")}`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add wood grain
        context.strokeStyle = `#${grainColor.toString(16).padStart(6, "0")}`;
        context.lineWidth = 2;

        for (let i = 0; i < 30; i++) {
            const y = Math.random() * canvas.height;
            context.beginPath();
            context.moveTo(0, y);

            // Create a wavy line
            for (let x = 0; x < canvas.width; x += 20) {
                const yOffset = y + (Math.random() * 10 - 5);
                context.lineTo(x, yOffset);
            }

            context.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        return texture;
    }

    // Create a carpet texture
    function createCarpetTexture(color: number): THREE.Texture {
        const canvas = createCanvas();
        if (!canvas) return new THREE.Texture();
        canvas.width = 256;
        canvas.height = 256;

        const context = canvas.getContext("2d");
        if (!context) return new THREE.Texture();

        // Fill with base color
        context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add carpet texture (random dots)
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;

            // Vary the color slightly for texture
            const colorVariation = Math.floor(Math.random() * 20) - 10;
            const r = ((color >> 16) & 0xff) + colorVariation;
            const g = ((color >> 8) & 0xff) + colorVariation;
            const b = (color & 0xff) + colorVariation;

            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.fillRect(x, y, 1, 1);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        return texture;
    }

    // Create a stone texture
    function createStoneTexture(color: number): THREE.Texture {
        const canvas = createCanvas();
        if (!canvas) return new THREE.Texture();
        canvas.width = 256;
        canvas.height = 256;

        const context = canvas.getContext("2d");
        if (!context) return new THREE.Texture();

        // Fill with base color
        context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Create a stone pattern (cracks and variations)
        for (let i = 0; i < 20; i++) {
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;

            context.beginPath();
            context.moveTo(startX, startY);

            // Create a random crack
            let x = startX;
            let y = startY;

            for (let j = 0; j < 5; j++) {
                x += Math.random() * 40 - 20;
                y += Math.random() * 40 - 20;
                context.lineTo(x, y);
            }

            context.strokeStyle = "#999999";
            context.lineWidth = 1;
            context.stroke();
        }

        // Add color variations
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = 5 + Math.random() * 15;

            // Vary the color slightly for texture
            const colorVariation = Math.floor(Math.random() * 30) - 15;
            const r = ((color >> 16) & 0xff) + colorVariation;
            const g = ((color >> 8) & 0xff) + colorVariation;
            const b = (color & 0xff) + colorVariation;

            context.fillStyle = `rgb(${r}, ${g}, ${b})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        return texture;
    }

    // Add specialized room features based on room type
    function addSpecializedRoomFeatures(
        roomGroup: THREE.Group,
        room: ModelData["rooms"][0]
    ) {
        const roomName = room.name.toLowerCase();

        if (roomName.includes("kitchen")) {
            // Add kitchen counter along one wall
            const counterWidth = room.width * 0.8;
            const counterDepth = room.length * 0.2;
            const counterHeight = 0.9; // Standard counter height

            const counterGeometry = new THREE.BoxGeometry(
                counterWidth,
                counterHeight,
                counterDepth
            );

            const counterMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333, // Dark counter
            });

            const counter = new THREE.Mesh(counterGeometry, counterMaterial);
            counter.position.set(
                room.width / 2,
                counterHeight / 2,
                room.length * 0.9 - counterDepth / 2
            );

            roomGroup.add(counter);
        } else if (roomName.includes("bath")) {
            // Add a simple bathtub representation
            const tubWidth = room.width * 0.4;
            const tubLength = room.length * 0.7;
            const tubHeight = 0.6;

            const tubGeometry = new THREE.BoxGeometry(
                tubWidth,
                tubHeight,
                tubLength
            );

            const tubMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff, // White tub
            });

            const tub = new THREE.Mesh(tubGeometry, tubMaterial);
            tub.position.set(room.width * 0.7, tubHeight / 2, room.length / 2);

            roomGroup.add(tub);
        } else if (roomName.includes("dining")) {
            // Add a simple table
            const tableWidth = room.width * 0.6;
            const tableLength = room.length * 0.6;
            const tableHeight = 0.75;

            const tableGeometry = new THREE.BoxGeometry(
                tableWidth,
                tableHeight,
                tableLength
            );

            const tableMaterial = new THREE.MeshStandardMaterial({
                color: 0x8b4513, // Wood table
            });

            const table = new THREE.Mesh(tableGeometry, tableMaterial);
            table.position.set(
                room.width / 2,
                tableHeight / 2,
                room.length / 2
            );

            roomGroup.add(table);
        } else if (roomName.includes("patio")) {
            // Slightly lower the floor for the patio
            roomGroup.children.forEach((child) => {
                if (
                    child instanceof THREE.Mesh &&
                    child.rotation.x === Math.PI / 2
                ) {
                    // Identify the floor
                    child.position.y = -0.1; // Lower the patio floor
                }
            });
        }
    }

    // Add point lights for better room illumination
    function addRoomLights(scene: THREE.Scene, rooms: ModelData["rooms"]) {
        rooms.forEach((room) => {
            // Skip invalid rooms
            if (room.width <= 0 || room.length <= 0 || room.height <= 0) return;

            // Add a point light in the center of each room
            const light = new THREE.PointLight(0xffffff, 0.5, 0);
            light.position.set(
                room.x + room.width / 2,
                room.y + room.height * 0.8, // Slightly below ceiling
                room.z + room.length / 2
            );

            scene.add(light);
        });
    }

    return (
        <div className="relative w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading 3D model...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md">
                        <h3 className="font-bold mb-2">Error Loading Model</h3>
                        <p>{error}</p>
                        <p className="text-sm mt-2">
                            Check the browser console for more details.
                        </p>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: "500px" }}
            />

            {/* Enhanced debug info overlay */}
            <div className="absolute bottom-2 left-2 text-xs bg-background/80 p-2 rounded">
                <p>
                    Model: {validRoomCount}/{roomCount} rooms,{" "}
                    {modelData.windows.length} windows, {modelData.doors.length}{" "}
                    doors
                </p>
                {modelData.rooms.length > 0 && (
                    <p>
                        First room: {modelData.rooms[0]?.name} (
                        {modelData.rooms[0]?.width}×{modelData.rooms[0]?.length}
                        ×{modelData.rooms[0]?.height})
                    </p>
                )}
                {modelData.rooms.length > 1 && (
                    <p>
                        Second room: {modelData.rooms[1]?.name} (
                        {modelData.rooms[1]?.width}×{modelData.rooms[1]?.length}
                        ×{modelData.rooms[1]?.height})
                    </p>
                )}
                <p>
                    Grid size: {gridSize}×{gridSize} m
                </p>
            </div>
        </div>
    );
}
