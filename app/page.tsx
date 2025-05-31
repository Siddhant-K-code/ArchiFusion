"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ZoomIn,
    ZoomOut,
    Loader2,
    Copy,
    Check,
    Save,
    Code,
    Wand2,
    Sun,
    Moon,
    Sunrise,
    Sunset,
    Maximize2,
    GripVertical,
    LayoutPanelLeft,
    LayoutPanelTop,
    Expand,
    Shrink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { CadModelViewer } from "@/components/cad-model-viewer";
import { InputPanel } from "@/components/input-panel";
import { CADJobStatus } from "@/components/cad-job-status";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Home() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedModel, setGeneratedModel] = useState<any>(null);
    const [generatedCode, setGeneratedCode] = useState("");
    const [activeTab, setActiveTab] = useState("visual");
    const [copied, setCopied] = useState(false);
    const [viewerSettings, setViewerSettings] = useState({
        showGrid: true,
        showAxes: true,
        backgroundColor: "#f0f0f0",
        lighting: "day",
        wireframe: false,
        zoom: 1,
        showMeasurements: false,
        roomLabels: true,
    });
    const [processingSteps, setProcessingSteps] = useState<{
        [key: string]: "pending" | "processing" | "completed" | "error";
    }>({
        sketch: "pending",
        vision: "pending",
        openai: "pending",
        model: "pending",
    });

    // Removed complex layout state - using simple responsive design now

    const codeRef = useRef<HTMLPreElement>(null);

    // Removed resize handling - using simple responsive design now

    // Function to update processing steps
    const updateProcessingStep = (
        step: string,
        status: "pending" | "processing" | "completed" | "error"
    ) => {
        setProcessingSteps((prev) => ({
            ...prev,
            [step]: status,
        }));
    };

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [showJobStatus, setShowJobStatus] = useState(false);

    const handleGenerate = async (inputs: { prompt: any; sketchData: any; speechData: any; photoData: any; }) => {
        try {
            // Extract inputs from the InputPanel component
            const { prompt, sketchData, speechData, photoData } = inputs;

            // Update prompt state for consistency with other parts of the app
            setPrompt(prompt || "");

            // Prepare request payload
            const payload: Record<string, any> = {};

            // Always include a prompt
            if (prompt) {
                payload.prompt = prompt;
            } else if (speechData) {
                payload.prompt = speechData;
            } else {
                // For sketch-only or photo-only mode, send a default prompt
                payload.prompt = "Generate a CAD model based on this input";
            }

            // Add other data if available
            if (sketchData) payload.sketchData = sketchData;
            if (photoData) payload.photoData = photoData;
            if (speechData) payload.speechData = speechData;

            console.log("Starting CAD generation job:", {
                hasPrompt: !!payload.prompt,
                hasSketchData: !!payload.sketchData,
                hasPhotoData: !!payload.photoData,
                hasSpeechData: !!payload.speechData,
            });

            // Start the job
            const response = await fetch("/api/cad-generator", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || `Failed to start generation: ${response.status}`
                );
            }

            const { jobId } = await response.json();
            setCurrentJobId(jobId);
            setShowJobStatus(true);
            setIsGenerating(true);

            console.log(`CAD generation job started: ${jobId}`);

            toast({
                title: "Generation started",
                description: "Your CAD model is being generated. This may take up to 60 seconds.",
            });

        } catch (error) {
            console.error("Error starting CAD generation:", error);

            // Update any pending steps to error
            Object.keys(processingSteps).forEach((step) => {
                if (
                    processingSteps[step] === "processing" ||
                    processingSteps[step] === "pending"
                ) {
                    updateProcessingStep(step, "error");
                }
            });

            // Fallback to mock data if Azure API fails
            const mockResponse = {
                modelData: generateMockModelData(
                    prompt || "Floor plan from input"
                ),
                code: generateMockCode(prompt || "Floor plan from input"),
            };

            setGeneratedModel(mockResponse.modelData);
            setGeneratedCode(mockResponse.code);
            setActiveTab("visual");

            toast({
                title: "Using fallback data",
                description:
                    "Could not connect to Azure API. Using sample data instead.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleJobComplete = (result: any) => {
        console.log("CAD generation job completed:", result);

        if (!result.modelData || !result.code) {
            console.error("Invalid response format from job:", result);
            toast({
                title: "Generation failed",
                description: "Invalid response format received.",
                variant: "destructive",
            });
            return;
        }

        // Ensure the modelData has the expected structure
        if (!Array.isArray(result.modelData.rooms) || result.modelData.rooms.length === 0) {
            console.error("Invalid or empty rooms array from job:", result.modelData);
            toast({
                title: "Generation failed",
                description: "No valid rooms found in generated model.",
                variant: "destructive",
            });
            return;
        }

        setGeneratedModel(result.modelData);
        setGeneratedCode(result.code);
        setActiveTab("visual");
        setShowJobStatus(false);
        setIsGenerating(false);

        // Auto-switch not needed anymore with responsive design

        toast({
            title: "Model generated successfully",
            description: "Your CAD model has been created successfully.",
        });
    };

    const handleJobError = (error: string) => {
        console.error("CAD generation job failed:", error);
        setShowJobStatus(false);
        setIsGenerating(false);

        // Fallback to mock data
        const mockResponse = {
            modelData: generateMockModelData(prompt || "Floor plan from input"),
            code: generateMockCode(prompt || "Floor plan from input"),
        };

        setGeneratedModel(mockResponse.modelData);
        setGeneratedCode(mockResponse.code);
        setActiveTab("visual");

        toast({
            title: "Generation failed, using fallback",
            description: error + ". Using sample data instead.",
            variant: "destructive",
        });
    };

    const handleJobCancel = () => {
        setShowJobStatus(false);
        setCurrentJobId(null);
        setIsGenerating(false);

        toast({
            title: "Generation cancelled",
            description: "CAD model generation has been cancelled.",
        });
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Code copied",
            description:
                "The generated code has been copied to your clipboard.",
        });
    };

    const handleSaveModel = async (format: string) => {
        try {
            // Get the Three.js scene from the CAD viewer
            const viewerContainer = document.querySelector('.cad-viewer-container');
            if (!viewerContainer) {
                throw new Error('3D viewer not found');
            }

            const canvas = viewerContainer.querySelector('canvas');
            if (!canvas) {
                throw new Error('3D scene not initialized');
            }

            // Get the Three.js renderer and scene from the canvas
            const renderer = (canvas as any).__three_renderer;
            const scene = (canvas as any).__three_scene;

            if (!renderer || !scene) {
                throw new Error('3D scene data not accessible');
            }

            let output: string;
            let filename: string;
            let mimeType: string;

            if (format === 'gltf') {
                // Dynamic import of GLTFExporter
                const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
                const exporter = new GLTFExporter();

                output = await new Promise((resolve, reject) => {
                    exporter.parse(
                        scene,
                        (gltf) => {
                            resolve(JSON.stringify(gltf, null, 2));
                        },
                        (error) => {
                            reject(error);
                        },
                        { binary: false }
                    );
                });

                filename = `architectural_model_${Date.now()}.gltf`;
                mimeType = 'application/json';
            } else if (format === 'obj') {
                // Dynamic import of OBJExporter
                const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
                const exporter = new OBJExporter();

                output = exporter.parse(scene);
                filename = `architectural_model_${Date.now()}.obj`;
                mimeType = 'text/plain';
            } else {
                throw new Error('Unsupported format');
            }

            // Create and trigger download
            const blob = new Blob([output], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: `Model exported as ${format.toUpperCase()}`,
                description: `Your model has been downloaded as ${filename}`,
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: 'Export failed',
                description: `Could not export model: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: 'destructive',
            });
        }
    };

    const handleZoom = (direction: "in" | "out") => {
        setViewerSettings((prev) => ({
            ...prev,
            zoom:
                direction === "in"
                    ? Math.min(prev.zoom + 0.2, 3)
                    : Math.max(prev.zoom - 0.2, 0.5),
        }));
    };

    // Mock function to generate model data based on prompt
    const generateMockModelData = (prompt: string) => {
        // This would be replaced with actual LLM-generated data
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
                    connected_to: ["living", "dining"],
                },
                {
                    name: "dining",
                    width: 4,
                    length: 5,
                    height: 3,
                    x: 5,
                    y: 0,
                    z: 4,
                    connected_to: ["kitchen"],
                },
                {
                    name: "hallway",
                    width: 2,
                    length: 5,
                    height: 3,
                    x: 0,
                    y: 0,
                    z: 7,
                    connected_to: [
                        "living",
                        "bedroom1",
                        "bedroom2",
                        "bathroom",
                    ],
                },
                {
                    name: "bedroom1",
                    width: 4,
                    length: 4,
                    height: 3,
                    x: -4,
                    y: 0,
                    z: 7,
                    connected_to: ["hallway"],
                },
                {
                    name: "bedroom2",
                    width: 4,
                    length: 4,
                    height: 3,
                    x: 2,
                    y: 0,
                    z: 7,
                    connected_to: ["hallway"],
                },
                {
                    name: "bathroom",
                    width: 3,
                    length: 2,
                    height: 3,
                    x: 0,
                    y: 0,
                    z: 12,
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
                    position: 0.7,
                },
                {
                    room: "bedroom1",
                    wall: "west",
                    width: 1.5,
                    height: 1.2,
                    position: 0.5,
                },
                {
                    room: "bedroom2",
                    wall: "east",
                    width: 1.5,
                    height: 1.2,
                    position: 0.5,
                },
            ],
            doors: [
                { from: "living", to: "kitchen", width: 1.2, height: 2.1 },
                { from: "living", to: "hallway", width: 1.2, height: 2.1 },
                { from: "kitchen", to: "dining", width: 1.2, height: 2.1 },
                { from: "hallway", to: "bedroom1", width: 0.9, height: 2.1 },
                { from: "hallway", to: "bedroom2", width: 0.9, height: 2.1 },
                { from: "hallway", to: "bathroom", width: 0.8, height: 2.1 },
            ],
        };
    };

    const generateMockCode = (prompt: string) => {
        return `// Generated Three.js code for: "${prompt}"
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
// ... Three.js implementation
`;
    };

    // Removed complex resize and layout handlers - using simple responsive design now

    // Processing status component
    const ProcessingStatus = () => (
        <Card>
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                    Processing Status
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Input Processing</span>
                        <div className="flex items-center">
                            {processingSteps.sketch === "pending" && (
                                <span className="text-xs text-muted-foreground">
                                    Waiting
                                </span>
                            )}
                            {processingSteps.sketch === "processing" && (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            )}
                            {processingSteps.sketch === "completed" && (
                                <Check className="h-3 w-3 text-green-500" />
                            )}
                            {processingSteps.sketch === "error" && (
                                <span className="text-xs text-destructive">
                                    Error
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-xs">
                            Computer Vision Analysis
                        </span>
                        <div className="flex items-center">
                            {processingSteps.vision === "pending" && (
                                <span className="text-xs text-muted-foreground">
                                    Waiting
                                </span>
                            )}
                            {processingSteps.vision === "processing" && (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            )}
                            {processingSteps.vision === "completed" && (
                                <Check className="h-3 w-3 text-green-500" />
                            )}
                            {processingSteps.vision === "error" && (
                                <span className="text-xs text-destructive">
                                    Error
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-xs">Azure OpenAI Processing</span>
                        <div className="flex items-center">
                            {processingSteps.openai === "pending" && (
                                <span className="text-xs text-muted-foreground">
                                    Waiting
                                </span>
                            )}
                            {processingSteps.openai === "processing" && (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            )}
                            {processingSteps.openai === "completed" && (
                                <Check className="h-3 w-3 text-green-500" />
                            )}
                            {processingSteps.openai === "error" && (
                                <span className="text-xs text-destructive">
                                    Error
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-xs">3D Model Generation</span>
                        <div className="flex items-center">
                            {processingSteps.model === "pending" && (
                                <span className="text-xs text-muted-foreground">
                                    Waiting
                                </span>
                            )}
                            {processingSteps.model === "processing" && (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            )}
                            {processingSteps.model === "completed" && (
                                <Check className="h-3 w-3 text-green-500" />
                            )}
                            {processingSteps.model === "error" && (
                                <span className="text-xs text-destructive">
                                    Error
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // Viewer settings component
    const ViewerSettings = () => (
        <Card>
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                    Visualization Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="show-grid"
                                className="cursor-pointer text-xs"
                            >
                                Show Grid
                            </Label>
                            <Switch
                                id="show-grid"
                                checked={viewerSettings.showGrid}
                                onCheckedChange={(checked) =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        showGrid: checked,
                                    }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="show-axes"
                                className="cursor-pointer text-xs"
                            >
                                Show Axes
                            </Label>
                            <Switch
                                id="show-axes"
                                checked={viewerSettings.showAxes}
                                onCheckedChange={(checked) =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        showAxes: checked,
                                    }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="wireframe"
                                className="cursor-pointer text-xs"
                            >
                                Wireframe Mode
                            </Label>
                            <Switch
                                id="wireframe"
                                checked={viewerSettings.wireframe}
                                onCheckedChange={(checked) =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        wireframe: checked,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Background Color</Label>
                        <Select
                            value={viewerSettings.backgroundColor}
                            onValueChange={(value) =>
                                setViewerSettings((prev) => ({
                                    ...prev,
                                    backgroundColor: value,
                                }))
                            }
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select background color" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="#f0f0f0">
                                    Light Gray
                                </SelectItem>
                                <SelectItem value="#ffffff">White</SelectItem>
                                <SelectItem value="#000000">Black</SelectItem>
                                <SelectItem value="#e6f7ff">
                                    Sky Blue
                                </SelectItem>
                                <SelectItem value="#f0f9e8">
                                    Mint Green
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Lighting</Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Button
                                variant={
                                    viewerSettings.lighting === "morning"
                                        ? "default"
                                        : "outline"
                                }
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        lighting: "morning",
                                    }))
                                }
                                title="Morning Light"
                            >
                                <Sunrise className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={
                                    viewerSettings.lighting === "day"
                                        ? "default"
                                        : "outline"
                                }
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        lighting: "day",
                                    }))
                                }
                                title="Day Light"
                            >
                                <Sun className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={
                                    viewerSettings.lighting === "evening"
                                        ? "default"
                                        : "outline"
                                }
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        lighting: "evening",
                                    }))
                                }
                                title="Evening Light"
                            >
                                <Sunset className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={
                                    viewerSettings.lighting === "night"
                                        ? "default"
                                        : "outline"
                                }
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        lighting: "night",
                                    }))
                                }
                                title="Night Light"
                            >
                                <Moon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-xs">Zoom Level</Label>
                            <span className="text-xs">
                                {viewerSettings.zoom.toFixed(1)}x
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleZoom("out")}
                                disabled={viewerSettings.zoom <= 0.5}
                            >
                                <ZoomOut className="h-3.5 w-3.5" />
                            </Button>
                            <Slider
                                value={[viewerSettings.zoom]}
                                min={0.5}
                                max={3}
                                step={0.1}
                                onValueChange={(value) =>
                                    setViewerSettings((prev) => ({
                                        ...prev,
                                        zoom: value[0],
                                    }))
                                }
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleZoom("in")}
                                disabled={viewerSettings.zoom >= 3}
                            >
                                <ZoomIn className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // Layout toolbar removed - using simple responsive design now

    // Removed complex layout configuration - using simple responsive design now

    return (
        <div className="container mx-auto px-2 py-2 md:px-4 md:py-4 max-w-full">
            <div className="flex flex-col">
                {/* Responsive Layout - Mobile: Stack vertically, Desktop: Side by side */}
                <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-8rem)] overflow-scroll gap-4">
                    {/* Input Panel - Full width on mobile, 40% on desktop */}
                    <div className="w-full lg:w-2/5 h-1/2 lg:h-full overflow-auto bg-background rounded-lg border">
                        <InputPanel
                            onGenerateModel={handleGenerate}
                            isGenerating={isGenerating}
                        />

                        {isGenerating && (
                            <div className="p-3 md:p-4">
                                <ProcessingStatus />
                            </div>
                        )}

                        {generatedModel && (
                            <div className="p-3 md:p-4 lg:block hidden">
                                <ViewerSettings />
                            </div>
                        )}
                    </div>

                    {/* Viewer Panel - Full width on mobile, 60% on desktop */}
                    <div className="w-full lg:w-3/5 h-1/2 lg:h-full overflow-auto bg-background rounded-lg border">
                        <div className="h-full flex flex-col">
                            <Card className="flex-grow overflow-hidden">
                                <CardContent className="p-0 h-full">
                                    <Tabs
                                        value={activeTab}
                                        onValueChange={setActiveTab}
                                        className="h-full flex flex-col"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 md:p-3 border-b gap-2">
                                            <CardTitle className="text-sm md:text-base font-medium">
                                                Generated Model
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <TabsList className="h-8 md:h-9">
                                                    <TabsTrigger
                                                        value="visual"
                                                        className="text-xs px-2 md:px-3 py-1 md:py-1.5"
                                                    >
                                                        Visual
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="code"
                                                        className="text-xs px-2 md:px-3 py-1 md:py-1.5"
                                                    >
                                                        Code
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="json"
                                                        className="text-xs px-2 md:px-3 py-1 md:py-1.5"
                                                    >
                                                        JSON
                                                    </TabsTrigger>
                                                </TabsList>

                                                {/* Lighting control removed from tabs - available in settings */}
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <TabsContent
                                                value="visual"
                                                className="h-full m-0 p-0"
                                            >
                                                {generatedModel ? (
                                                    <div className="relative h-full">
                                                        <CadModelViewer
                                                            modelData={
                                                                generatedModel
                                                            }
                                                            settings={
                                                                viewerSettings
                                                            }
                                                        />

                                                        <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 flex flex-col sm:flex-row gap-2">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-1 md:gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90 text-xs md:text-sm h-8 md:h-9"
                                                                onClick={() =>
                                                                    handleSaveModel(
                                                                        "gltf"
                                                                    )
                                                                }
                                                            >
                                                                <Save className="h-3 w-3 md:h-4 md:w-4" />
                                                                <span className="hidden sm:inline">Save as GLTF</span>
                                                                <span className="sm:hidden">GLTF</span>
                                                            </Button>
                                                            <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="gap-1 md:gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90 text-xs md:text-sm h-8 md:h-9"
                                                            onClick={() =>
                                                            handleSaveModel(
                                                            "obj"
                                                            )
                                                            }
                                                            >
                                                            <Save className="h-3 w-3 md:h-4 md:w-4" />
                                                            <span className="hidden sm:inline">Save as OBJ</span>
                                                                <span className="sm:hidden">OBJ</span>
                                                             </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                                                                onClick={() => {
                                                                    const viewerElement =
                                                                        document.querySelector(
                                                                            ".cad-viewer-container"
                                                                        );
                                                                    if (
                                                                        viewerElement
                                                                    ) {
                                                                        if (
                                                                            document.fullscreenElement
                                                                        ) {
                                                                            document.exitFullscreen();
                                                                        } else {
                                                                            viewerElement.requestFullscreen();
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <Maximize2 className="h-4 w-4" />
                                                                Fullscreen
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center bg-muted/30">
                                                        <div className="text-center p-6">
                                                            <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium mb-2">
                                                                Ready to Build Your Architecture
                                                            </h3>
                                                            <p className="text-muted-foreground max-w-md">
                                                                Describe your architectural vision in the input panel - houses, offices, retail spaces, or any building type. Then click 'Build 3D Architecture' to bring your ideas to life.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent
                                                value="code"
                                                className="h-full m-0 p-0"
                                            >
                                                {generatedCode ? (
                                                    <div className="relative h-full">
                                                        <ScrollArea className="h-full">
                                                            <pre
                                                                ref={codeRef}
                                                                className="p-4 text-sm font-mono"
                                                            >
                                                                <code>
                                                                    {
                                                                        generatedCode
                                                                    }
                                                                </code>
                                                            </pre>
                                                        </ScrollArea>

                                                        <div className="absolute top-4 right-4">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2"
                                                                onClick={
                                                                    handleCopyCode
                                                                }
                                                            >
                                                                {copied ? (
                                                                    <>
                                                                        <Check className="h-4 w-4" />
                                                                        Copied!
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="h-4 w-4" />
                                                                        Copy
                                                                        Code
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center bg-muted/30">
                                                        <div className="text-center p-6">
                                                            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium mb-2">
                                                                No Code
                                                                Generated Yet
                                                            </h3>
                                                            <p className="text-muted-foreground max-w-md">
                                                                Generate a model
                                                                first to see the
                                                                corresponding
                                                                Three.js code.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent
                                                value="json"
                                                className="h-full m-0 p-0"
                                            >
                                                {generatedModel ? (
                                                    <div className="relative h-full">
                                                        <ScrollArea className="h-full">
                                                            <pre className="p-4 text-sm font-mono">
                                                                <code>
                                                                    {JSON.stringify(
                                                                        generatedModel,
                                                                        null,
                                                                        2
                                                                    )}
                                                                </code>
                                                            </pre>
                                                        </ScrollArea>

                                                        <div className="absolute top-4 right-4">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(
                                                                        JSON.stringify(
                                                                            generatedModel,
                                                                            null,
                                                                            2
                                                                        )
                                                                    );
                                                                    toast({
                                                                        title: "JSON copied",
                                                                        description:
                                                                            "The model data has been copied to your clipboard.",
                                                                    });
                                                                }}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                                Copy JSON
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center bg-muted/30">
                                                        <div className="text-center p-6">
                                                            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium mb-2">
                                                                No JSON
                                                                Generated Yet
                                                            </h3>
                                                            <p className="text-muted-foreground max-w-md">
                                                                Generate a model
                                                                first to see the
                                                                structured JSON
                                                                data.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* CAD Generation Job Status Dialog */}
            <Dialog open={showJobStatus} onOpenChange={setShowJobStatus}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generating CAD Model</DialogTitle>
                    </DialogHeader>
                    {currentJobId && (
                        <CADJobStatus
                            jobId={currentJobId}
                            onComplete={handleJobComplete}
                            onError={handleJobError}
                            onCancel={handleJobCancel}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
