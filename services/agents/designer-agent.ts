import { BaseAgent, AgentInput, AgentOutput } from "./base-agent";
import { AGENT_CONFIG } from "./agent-config";

export class DesignerAgent extends BaseAgent {
    constructor() {
        super("Designer", AGENT_CONFIG.designerSystemPrompt);
    }

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log("Designer Agent processing requirements");

        try {
            // Step 1: Prepare the prompt with the requirements
            const prompt = this.preparePrompt(input.requirements);

            // Step 2: Call the LLM to generate a design
            const llmResponse = await this.callLLM(prompt, 0.4); // Higher temperature for creativity

            // Step 3: Parse and validate the design
            const rawDesign = this.safeParseJSON(llmResponse);

            // Step 4: Enhance and validate the design
            const enhancedDesign = this.enhanceDesign(
                rawDesign,
                input.requirements
            );

            return {
                requirements: input.requirements,
                design: enhancedDesign,
            };
        } catch (error) {
            console.error("Designer Agent error:", error);
            return {
                error: `Designer Agent failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                requirements: input.requirements,
                designCreated: false,
            };
        }
    }

    private preparePrompt(requirements: any): string {
        return `Create a detailed architectural design based on these requirements:
${JSON.stringify(requirements, null, 2)}

Generate a complete 3D model with:
1. Multiple rooms with appropriate dimensions and positions
2. Proper connections between rooms (doors)
3. Windows placed appropriately on walls
4. Logical spatial relationships

Your response must be a valid JSON object with the following structure:
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
      "position": number (0-1 along wall)
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

IMPORTANT:
- Ensure all measurements are in meters.
- Position rooms logically with proper spatial relationships.
- Include at least one window per living space.
- Ensure doors connect adjacent rooms correctly.
- Use standard dimensions (doors: ~0.9m width, windows: ~1.2m width).
- Make each room's dimensions appropriate for its function.`;
    }

    private enhanceDesign(design: any, requirements: any): any {
        // Validate and enhance the design
        if (
            !design ||
            !design.rooms ||
            !Array.isArray(design.rooms) ||
            design.rooms.length === 0
        ) {
            console.warn("Invalid design structure, creating fallback design");
            return this.createFallbackDesign(requirements);
        }

        // Ensure all required properties exist
        design.rooms.forEach((room: any) => {
            room.name = room.name || "unnamedRoom";
            room.width = this.ensurePositiveNumber(room.width, 4);
            room.length = this.ensurePositiveNumber(room.length, 4);
            room.height = this.ensurePositiveNumber(room.height, 3);
            room.x = room.x !== undefined ? room.x : 0;
            room.y = room.y !== undefined ? room.y : 0;
            room.z = room.z !== undefined ? room.z : 0;
            room.connected_to = Array.isArray(room.connected_to)
                ? room.connected_to
                : [];
        });

        // Ensure windows array exists
        if (!design.windows || !Array.isArray(design.windows)) {
            design.windows = [];
        }

        // Add windows if missing for living spaces
        const livingSpaces = ["living", "bedroom", "kitchen", "dining"];
        design.rooms.forEach((room: any) => {
            const roomType = room.name.toLowerCase();
            const hasLivingSpaceKeyword = livingSpaces.some((space) =>
                roomType.includes(space)
            );
            const hasWindow = design.windows.some(
                (window: any) => window.room === room.name
            );

            if (hasLivingSpaceKeyword && !hasWindow) {
                design.windows.push({
                    room: room.name,
                    wall: "south", // Default to south wall
                    width: 1.2,
                    height: 1.0,
                    position: 0.5,
                });
            }
        });

        // Ensure doors array exists
        if (!design.doors || !Array.isArray(design.doors)) {
            design.doors = [];
        }

        // Add doors based on connected_to if missing
        design.rooms.forEach((room: any) => {
            room.connected_to.forEach((connectedRoom: string) => {
                const doorExists = design.doors.some(
                    (door: any) =>
                        (door.from === room.name &&
                            door.to === connectedRoom) ||
                        (door.from === connectedRoom && door.to === room.name)
                );

                if (!doorExists) {
                    design.doors.push({
                        from: room.name,
                        to: connectedRoom,
                        width: 0.9,
                        height: 2.1,
                    });
                }
            });
        });

        return design;
    }

    private ensurePositiveNumber(value: any, defaultValue: number): number {
        const num = Number(value);
        return !isNaN(num) && num > 0 ? num : defaultValue;
    }

    private createFallbackDesign(requirements: any): any {
        // Create a simple fallback design if the LLM fails
        return {
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
                {
                    name: "hallway",
                    width: 2,
                    length: 5,
                    height: 3,
                    x: 0,
                    y: 0,
                    z: 7,
                    connected_to: ["living", "bedroom"],
                },
                {
                    name: "bedroom",
                    width: 4,
                    length: 4,
                    height: 3,
                    x: 2,
                    y: 0,
                    z: 7,
                    connected_to: ["hallway"],
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
                {
                    room: "kitchen",
                    wall: "east",
                    width: 1.5,
                    height: 1.2,
                    position: 0.5,
                },
                {
                    room: "bedroom",
                    wall: "east",
                    width: 1.5,
                    height: 1.2,
                    position: 0.5,
                },
            ],
            doors: [
                { from: "living", to: "kitchen", width: 1.2, height: 2.1 },
                { from: "living", to: "hallway", width: 1.2, height: 2.1 },
                { from: "hallway", to: "bedroom", width: 0.9, height: 2.1 },
            ],
        };
    }
}
