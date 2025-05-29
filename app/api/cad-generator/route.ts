import { NextResponse } from "next/server";

// Dynamic import to avoid initialization during build
let generateCadModel: any;

// Simple in-memory job store (use Redis/database in production)
const jobs = new Map<string, { 
    status: string; 
    result?: any; 
    error?: string; 
    progress?: number;
    startTime?: number;
}>();

export async function POST(req: Request) {
    try {
        // Initialize service dynamically
        if (!generateCadModel) {
            const { generateCadModel: gcm } = await import("@/services/llm-service");
            generateCadModel = gcm;
        }

        const body = await req.json();
        const { prompt, sketchData, speechData, photoData } = body;

        if (!prompt && !sketchData && !speechData && !photoData) {
            return NextResponse.json(
                { error: "At least one input type is required" },
                { status: 400 }
            );
        }

        // Generate unique job ID
        const jobId = `cad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Initialize job status
        jobs.set(jobId, { 
            status: "queued", 
            progress: 0,
            startTime: Date.now()
        });

        console.log(`Starting CAD generation job ${jobId} with inputs:
            - Text prompt: ${prompt ? "provided" : "not provided"}
            - Sketch data: ${sketchData ? "provided" : "not provided"}
            - Speech data: ${speechData ? "provided" : "not provided"}
            - Photo data: ${photoData ? "provided" : "not provided"}`);

        // Start background processing (don't await)
        processCADJob(jobId, { prompt, sketchData, speechData, photoData });

        return NextResponse.json({ jobId, status: "queued" });

    } catch (error) {
        console.error("Error queuing CAD job:", error);
        return NextResponse.json(
            { error: "Failed to queue CAD generation job" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const job = jobs.get(jobId);
    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Add elapsed time for better UX
    const elapsed = job.startTime ? Date.now() - job.startTime : 0;
    
    return NextResponse.json({
        ...job,
        elapsed: Math.round(elapsed / 1000) // seconds
    });
}

async function processCADJob(jobId: string, data: any) {
    try {
        console.log(`Processing CAD job ${jobId}...`);
        jobs.set(jobId, { 
            status: "processing", 
            progress: 20,
            startTime: jobs.get(jobId)?.startTime || Date.now()
        });
        
        const textPrompt = data.prompt || "Generate a CAD model based on the provided inputs";
        
        jobs.set(jobId, { 
            status: "analyzing_inputs", 
            progress: 40,
            startTime: jobs.get(jobId)?.startTime
        });
        
        jobs.set(jobId, { 
            status: "generating_model", 
            progress: 70,
            startTime: jobs.get(jobId)?.startTime
        });
        
        const result = await generateCadModel(
            textPrompt, 
            data.sketchData, 
            data.speechData, 
            data.photoData
        );
        
        console.log(`CAD job ${jobId} completed successfully`);
        jobs.set(jobId, { 
            status: "completed", 
            progress: 100, 
            result,
            startTime: jobs.get(jobId)?.startTime
        });
        
        // Clean up after 1 hour
        setTimeout(() => {
            console.log(`Cleaning up CAD job ${jobId}`);
            jobs.delete(jobId);
        }, 3600000);
        
    } catch (error) {
        console.error(`CAD job ${jobId} failed:`, error);
        jobs.set(jobId, { 
            status: "failed", 
            error: error instanceof Error ? error.message : String(error),
            startTime: jobs.get(jobId)?.startTime
        });
    }
}
