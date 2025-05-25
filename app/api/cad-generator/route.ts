import { NextResponse } from "next/server";
import { generateCadModel } from "@/services/llm-service";

export async function POST(req: Request) {
    try {
        // Parse the request body
        const body = await req.json();
        const { prompt, sketchData, speechData, photoData } = body;

        // Validate the input - at least one input type is required
        if (!prompt && !sketchData && !speechData && !photoData) {
            return NextResponse.json(
                {
                    error: "At least one input type (prompt, sketchData, speechData, or photoData) is required",
                },
                { status: 400 }
            );
        }

        // Create a default prompt if only non-text inputs are provided
        const textPrompt =
            prompt || "Generate a CAD model based on the provided inputs";

        console.log(
            `Processing request with:
            - Text prompt: ${prompt ? "provided" : "not provided"}
            - Sketch data: ${sketchData ? "provided" : "not provided"}
            - Speech data: ${speechData ? "provided" : "not provided"}
            - Photo data: ${photoData ? "provided" : "not provided"}`
        );

        // Generate the CAD model using all available inputs
        const result = await generateCadModel(
            textPrompt,
            sketchData,
            speechData,
            photoData
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in CAD generator API:", error);

        // Provide more detailed error message
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            { error: "Failed to generate CAD model", details: errorMessage },
            { status: 500 }
        );
    }
}
