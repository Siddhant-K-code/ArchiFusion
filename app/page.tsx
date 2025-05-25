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

    // Layout state
    const [layoutMode, setLayoutMode] = useState<
        "horizontal" | "vertical" | "input-focus" | "viewer-focus"
    >("horizontal");
    const [inputPanelSize, setInputPanelSize] = useState(40); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const resizeStartRef = useRef<{
        position: number;
        startSize: number;
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const codeRef = useRef<HTMLPreElement>(null);

    // Effect to handle window resize during dragging
    useEffect(() => {
        const handleWindowResize = () => {
            if (isResizing) {
                setIsResizing(false);
                resizeStartRef.current = null;
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("resize", handleWindowResize);
            return () => window.removeEventListener("resize", handleWindowResize);
        }
    }, [isResizing]);

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

    const handleGenerate = async (inputs: { prompt: any; sketchData: any; speechData: any; photoData: any; }) => {
        // Reset processing steps
        setProcessingSteps({
            sketch: "pending",
            vision: "pending",
            openai: "pending",
            model: "pending",
        });

        setIsGenerating(true);

        try {
            // Extract inputs from the InputPanel component
            const { prompt, sketchData, speechData, photoData } = inputs;

            // Update prompt state for consistency with other parts of the app
            setPrompt(prompt || "");

            // Mark sketch processing as complete if not using sketch
            if (!sketchData) {
                updateProcessingStep("sketch", "completed");
            } else {
                // Mark sketch processing as active then complete
                updateProcessingStep("sketch", "processing");
                setTimeout(
                    () => updateProcessingStep("sketch", "completed"),
                    500
                );
            }

            // Prepare request payload - matches Azure API expectations
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

            // Add sketch data if available
            if (sketchData) {
                payload.sketchData = sketchData;
            }

            // Add photo data if available
            if (photoData) {
                payload.photoData = photoData;
                // When using photo, mark vision processing as active
                updateProcessingStep("vision", "processing");
            }

            console.log("Generating CAD model with Azure services:", {
                hasPrompt: !!payload.prompt,
                hasSketchData: !!payload.sketchData,
                hasPhotoData: !!payload.photoData,
                hasSpeechData: !!speechData,
            });

            // Mark OpenAI processing as active
            updateProcessingStep("openai", "processing");

            // Call our API endpoint - connects to Azure services
            const response = await fetch("/api/cad-generator", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            // If sketch or photo was provided, mark vision processing as complete
            if (sketchData || photoData) {
                updateProcessingStep("vision", "completed");
            }

            // Mark OpenAI processing as complete
            updateProcessingStep("openai", "completed");

            // Mark model generation as active
            updateProcessingStep("model", "processing");

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                updateProcessingStep("model", "error");
                throw new Error(
                    `Failed to generate model with Azure: ${response.status} ${
                        response.statusText
                    }${errorData.details ? ` - ${errorData.details}` : ""}`
                );
            }

            const data = await response.json();
            console.log("Azure API Response:", data);

            if (!data.modelData || !data.code) {
                console.error("Invalid response format from Azure:", data);
                updateProcessingStep("model", "error");
                throw new Error("Invalid response format from Azure API");
            }

            // Ensure the modelData has the expected structure
            if (
                !Array.isArray(data.modelData.rooms) ||
                data.modelData.rooms.length === 0
            ) {
                console.error(
                    "Invalid or empty rooms array from Azure:",
                    data.modelData
                );
                updateProcessingStep("model", "error");
                throw new Error(
                    "Invalid model data from Azure: no rooms found"
                );
            }

            // Mark model generation as complete
            updateProcessingStep("model", "completed");

            setGeneratedModel(data.modelData);
            setGeneratedCode(data.code);
            setActiveTab("visual");

            // If we're in input-focus mode, switch to viewer-focus after generation
            if (layoutMode === "input-focus") {
                setLayoutMode("viewer-focus");
            }

            toast({
                title: "Model generated successfully",
                description: "Your CAD model has been created using Azure AI.",
            });
        } catch (error) {
            console.error("Error with Azure services:", error);

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

    const handleSaveModel = (format: string) => {
        // In a real app, this would trigger a download of the model in the specified format
        toast({
            title: `Model saved as ${format.toUpperCase()}`,
            description: `Your model has been exported in ${format.toUpperCase()} format.`,
        });
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

    // Resize handlers
    const handleResizeStart = (e: { preventDefault: () => void; clientX: any; clientY: any; }) => {
        e.preventDefault();

        let position;
        if (layoutMode === "horizontal") {
            position = e.clientX;
        } else {
            position = e.clientY;
        }

        resizeStartRef.current = {
            position,
            startSize: inputPanelSize,
        };

        setIsResizing(true);

        document.addEventListener("mousemove", handleResizeMove);
        document.addEventListener("mouseup", handleResizeEnd);
    };

    const handleResizeMove = (e: { clientX: number; clientY: number; }) => {
        if (!isResizing || !resizeStartRef.current || !containerRef.current)
            return;

        const containerRect = containerRef.current.getBoundingClientRect();
        let newSize;

        if (layoutMode === "horizontal") {
            const containerWidth = containerRect.width;
            const diff = e.clientX - resizeStartRef.current.position;
            const diffPercent = (diff / containerWidth) * 100;
            newSize = Math.min(
                80,
                Math.max(20, resizeStartRef.current.startSize + diffPercent)
            );
        } else {
            const containerHeight = containerRect.height;
            const diff = e.clientY - resizeStartRef.current.position;
            const diffPercent = (diff / containerHeight) * 100;
            newSize = Math.min(
                80,
                Math.max(20, resizeStartRef.current.startSize + diffPercent)
            );
        }

        setInputPanelSize(newSize);
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
        resizeStartRef.current = null;

        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
    };

    // Layout mode handlers
    const toggleLayoutMode = () => {
        setLayoutMode(layoutMode === "horizontal" ? "vertical" : "horizontal");
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

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

    // Layout toolbar
    const LayoutToolbar = () => (
        <div className="flex items-center justify-between mb-4 bg-muted/40 rounded-lg p-2">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${
                        layoutMode === "horizontal" ? "bg-muted" : ""
                    }`}
                    onClick={() => setLayoutMode("horizontal")}
                    title="Horizontal Split"
                >
                    <LayoutPanelLeft className="h-4 w-4 mr-1" />
                    <span className="text-xs">Horizontal</span>
                </Button>
                {/* <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${
                        layoutMode === "vertical" ? "bg-muted" : ""
                    }`}
                    onClick={() => setLayoutMode("vertical")}
                    title="Vertical Split"
                >
                    <LayoutPanelTop className="h-4 w-4 mr-1" />
                    <span className="text-xs">Vertical</span>
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${
                        layoutMode === "input-focus" ? "bg-muted" : ""
                    }`}
                    onClick={() => setLayoutMode("input-focus")}
                    title="Focus on Input"
                >
                    <Shrink className="h-4 w-4 mr-1" />
                    <span className="text-xs">Input Focus</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 ${
                        layoutMode === "viewer-focus" ? "bg-muted" : ""
                    }`}
                    onClick={() => setLayoutMode("viewer-focus")}
                    title="Focus on Viewer"
                >
                    <Expand className="h-4 w-4 mr-1" />
                    <span className="text-xs">Viewer Focus</span>
                </Button> */}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.documentElement.requestFullscreen();
                        }
                    }}
                >
                    <Maximize2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Fullscreen</span>
                </Button>
            </div>
        </div>
    );

    // Determine layout classes and styles based on mode
    const getLayoutConfig = () => {
        switch (layoutMode) {
            case "horizontal":
                return {
                    container: "flex flex-col lg:flex-row h-[calc(100vh-6rem)]",
                    inputPanel: {
                        className: "flex-shrink-0",
                        style: { width: `${inputPanelSize}%` }
                    },
                    resizer: {
                        className: "hidden lg:flex w-2 cursor-col-resize hover:bg-accent/50 active:bg-accent",
                        style: {}
                    },
                    viewerPanel: {
                        className: "flex-grow",
                        style: { width: `${100 - inputPanelSize}%` }
                    },
                };
            case "vertical":
                return {
                    container: "flex flex-col h-[calc(100vh-10rem)]",
                    inputPanel: {
                        className: "flex-shrink-0",
                        style: { height: `${inputPanelSize}%` }
                    },
                    resizer: {
                        className: "h-2 cursor-row-resize hover:bg-accent/50 active:bg-accent",
                        style: {}
                    },
                    viewerPanel: {
                        className: "flex-grow",
                        style: { height: `${100 - inputPanelSize}%` }
                    },
                };
            case "input-focus":
                return {
                    container: "flex flex-col h-[calc(100vh-10rem)]",
                    inputPanel: {
                        className: "h-full flex-grow",
                        style: {}
                    },
                    resizer: {
                        className: "hidden",
                        style: {}
                    },
                    viewerPanel: {
                        className: "hidden",
                        style: {}
                    },
                };
            case "viewer-focus":
                return {
                    container: "flex flex-col h-[calc(100vh-10rem)]",
                    inputPanel: {
                        className: "hidden",
                        style: {}
                    },
                    resizer: {
                        className: "hidden",
                        style: {}
                    },
                    viewerPanel: {
                        className: "h-full flex-grow",
                        style: {}
                    },
                };
            default:
                return {
                    container: "flex flex-col lg:flex-row h-[calc(100vh-6rem)]",
                    inputPanel: {
                        className: "lg:w-[40%] flex-shrink-0",
                        style: {}
                    },
                    resizer: {
                        className: "hidden lg:flex w-2 cursor-col-resize hover:bg-accent/50 active:bg-accent",
                        style: {}
                    },
                    viewerPanel: {
                        className: "lg:w-[60%] flex-grow",
                        style: {}
                    },
                };
        }
    };

    const layoutConfig = getLayoutConfig();

    return (
        <div className="container mx-auto py-4">
            <div className="flex flex-col">
                <div className="flex justify-between items-center">
                    {/* <h1 className="text-2xl font-bold tracking-tight">
                        3D Model Generator
                    </h1> */}
                    {/* <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (layoutMode === "viewer-focus") {
                                    setLayoutMode("horizontal");
                                } else {
                                    setLayoutMode("viewer-focus");
                                }
                            }}
                        >
                            {layoutMode === "viewer-focus"
                                ? "Show Input"
                                : "Hide Input"}
                        </Button>
                    </div> */}
                </div>

                {/* <LayoutToolbar /> */}

                <div ref={containerRef} className={layoutConfig.container}>
                    {/* Input Panel */}
                    <div
                        className={`${layoutConfig.inputPanel.className} overflow-auto bg-background`}
                        style={layoutConfig.inputPanel.style}
                    >
                        <div className="h-full flex flex-col">
                            <InputPanel
                                onGenerateModel={handleGenerate}
                                isGenerating={isGenerating}
                            />

                            {isGenerating && (
                                <div className="p-4">
                                    <ProcessingStatus />
                                </div>
                            )}

                            {generatedModel && layoutMode !== "vertical" && (
                                <div className="p-4">
                                    <ViewerSettings />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Viewer Panel */}
                    <div
                        className={`${layoutConfig.viewerPanel.className} overflow-auto`}
                        style={layoutConfig.viewerPanel.style}
                    >
                        <div className="h-full flex flex-col">
                            <Card className="flex-grow overflow-hidden">
                                <CardContent className="p-0 h-full">
                                    <Tabs
                                        value={activeTab}
                                        onValueChange={setActiveTab}
                                        className="h-full flex flex-col"
                                    >
                                        <div className="flex justify-between items-center p-3 border-b">
                                            <CardTitle className="text-base font-medium">
                                                Generated Model
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <TabsList>
                                                    <TabsTrigger
                                                        value="visual"
                                                        className="text-xs px-3 py-1.5"
                                                    >
                                                        Visual
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="code"
                                                        className="text-xs px-3 py-1.5"
                                                    >
                                                        Code
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="json"
                                                        className="text-xs px-3 py-1.5"
                                                    >
                                                        JSON
                                                    </TabsTrigger>
                                                </TabsList>

                                                {layoutMode === "vertical" &&
                                                    generatedModel && (
                                                        <Select
                                                            value={
                                                                viewerSettings.lighting
                                                            }
                                                            onValueChange={(
                                                                value
                                                            ) =>
                                                                setViewerSettings(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        lighting:
                                                                            value,
                                                                    })
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-8 w-[110px]">
                                                                <SelectValue placeholder="Lighting" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="morning">
                                                                    Morning
                                                                </SelectItem>
                                                                <SelectItem value="day">
                                                                    Day
                                                                </SelectItem>
                                                                <SelectItem value="evening">
                                                                    Evening
                                                                </SelectItem>
                                                                <SelectItem value="night">
                                                                    Night
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
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

                                                        <div className="absolute bottom-4 right-4 flex space-x-2">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                                                                onClick={() =>
                                                                    handleSaveModel(
                                                                        "gltf"
                                                                    )
                                                                }
                                                            >
                                                                <Save className="h-4 w-4" />
                                                                Save as GLTF
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                                                                onClick={() =>
                                                                    handleSaveModel(
                                                                        "obj"
                                                                    )
                                                                }
                                                            >
                                                                <Save className="h-4 w-4" />
                                                                Save as OBJ
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
        </div>
    );
}
