"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Wand2,
    Mic,
    Camera,
    Pencil,
    Loader2,
    Square,
    Trash,
    Check,
    X,
    Maximize2,
} from "lucide-react";
import { DesignCanvas } from "@/components/design-canvas";
import { toast } from "@/components/ui/use-toast";

interface MultimodalInputProps {
    onGenerateModel: (inputs: {
        prompt: string;
        sketchData: string | null;
        speechData: string | null;
        photoData: string | null;
    }) => void;
    isGenerating: boolean;
}

export function MultimodalInput({
    onGenerateModel,
    isGenerating,
}: MultimodalInputProps) {
    // Input state
    const [textPrompt, setTextPrompt] = useState("");
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [photoData, setPhotoData] = useState<string | null>(null);

    // Active tab state
    const [activeTab, setActiveTab] = useState<
        "text" | "sketch" | "speech" | "photo"
    >("text");

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Camera state
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Sketch state
    const canvasRef = useRef<any>(null);

    // Cleanup recording timer on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Text prompt handlers
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextPrompt(e.target.value);
    };

    // Speech recording handlers
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/wav",
                });
                await processAudioRecording(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

            toast({
                title: "Recording started",
                description:
                    "Speak clearly to describe your architectural design requirements.",
            });
        } catch (error) {
            console.error("Error starting recording:", error);
            toast({
                title: "Recording failed",
                description:
                    "Could not access microphone. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Clear timer
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const processAudioRecording = async (audioBlob: Blob) => {
        try {
            // Prepare form data
            const formData = new FormData();
            formData.append("audio", audioBlob);

            // Call speech-to-text API
            const response = await fetch("/api/speech-to-text", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to process speech");
            }

            const data = await response.json();
            setSpeechTranscript(data.text);

            toast({
                title: "Speech processed",
                description: "Your speech has been converted to text.",
            });
        } catch (error) {
            console.error("Error processing speech:", error);
            toast({
                title: "Speech processing failed",
                description:
                    "Could not convert audio to text. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Camera handlers
    const activateCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsCameraActive(true);
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
            toast({
                title: "Camera activation failed",
                description:
                    "Could not access camera. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const deactivateCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !isCameraActive) return;

        try {
            if (typeof document === "undefined") return;
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(
                    videoRef.current,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
                const dataUrl = canvas.toDataURL("image/png");
                setPhotoData(dataUrl);
                deactivateCamera();

                toast({
                    title: "Photo captured",
                    description:
                        "Your space photo has been captured for analysis.",
                });
            }
        } catch (error) {
            console.error("Error capturing photo:", error);
            toast({
                title: "Photo capture failed",
                description: "Could not capture photo. Please try again.",
                variant: "destructive",
            });
        }
    };

    const clearPhoto = () => {
        setPhotoData(null);
    };

    // Sketch capture
    const captureSketchData = (): string | null => {
        if (!canvasRef.current) return null;

        try {
            // Get canvas element from the DesignCanvas component
            const canvasElement = canvasRef.current.getCanvasElement();
            if (!canvasElement) {
                console.warn("Canvas element not available");
                return null;
            }

            // Convert canvas to data URL
            return canvasElement.toDataURL("image/png");
        } catch (error) {
            console.error("Error capturing sketch data:", error);
            return null;
        }
    };

    const clearSketch = () => {
        if (canvasRef.current) {
            canvasRef.current.clearCanvas();
        }
    };

    // Form submission
    const handleSubmit = () => {
        const sketchData = activeTab === "sketch" ? captureSketchData() : null;

        // Ensure at least one input is provided
        if (!textPrompt && !sketchData && !speechTranscript && !photoData) {
            toast({
                title: "No input provided",
                description:
                    "Please provide at least one input (text, sketch, speech, or photo).",
                variant: "destructive",
            });
            return;
        }

        // Call the parent function with all inputs
        onGenerateModel({
            prompt: textPrompt || speechTranscript || "", // Use speech transcript as fallback if no text
            sketchData,
            speechData: speechTranscript || null,
            photoData,
        });
    };

    // Format time for recording display
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${
            remainingSeconds < 10 ? "0" : ""
        }${remainingSeconds}`;
    };

    // Categorized example prompts for better UX
    const examplePrompts = {
        residential: {
            label: "Residential",
            prompts: [
                "Design a luxury 2-story villa with 4 bedrooms, master suite with walk-in closet, gourmet kitchen, home theater, and wine cellar.",
                "Create a modern tiny house with loft bedroom, compact kitchen, fold-out dining, and smart storage solutions.",
                "Build a sustainable family home with solar panels, rainwater collection, garden spaces, and natural materials."
            ]
        },
        commercial: {
            label: "Commercial",
            prompts: [
                "Create a modern coworking space with hot desks, phone booths, meditation room, coffee bar, and rooftop terrace access.",
                "Build a tech startup office with open workspace, gaming area, podcast studio, kitchen, and collaboration zones.",
                "Design a corporate headquarters with conference rooms, executive suites, cafeteria, and presentation center."
            ]
        },
        hospitality: {
            label: "Hospitality",
            prompts: [
                "Generate a boutique hotel lobby with check-in desk, lounge seating, business center, gift shop, and grand staircase.",
                "Design a modern restaurant with open kitchen, bar area, dining spaces for 80 people, and outdoor patio.",
                "Create a luxury retail store with product displays, fitting rooms, checkout areas, and customer lounge."
            ]
        }
    };

    const handleExampleClick = (example: string) => {
        setTextPrompt(example);
        setActiveTab("text");
    };

    return (
        <Card>
            <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Multimodal Input</h2>
                    <div className="flex">
                        <Label className="mr-2 mt-1.5 text-sm text-muted-foreground">
                            Input Methods:
                        </Label>
                        <Tabs
                            value={activeTab}
                            onValueChange={(v) => setActiveTab(v as any)}
                        >
                            <TabsList>
                                <TabsTrigger
                                    value="text"
                                    className="flex items-center gap-1"
                                >
                                    <Wand2 className="h-3.5 w-3.5" />
                                    <span>Text</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="sketch"
                                    className="flex items-center gap-1"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span>Sketch</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="speech"
                                    className="flex items-center gap-1"
                                >
                                    <Mic className="h-3.5 w-3.5" />
                                    <span>Voice</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="photo"
                                    className="flex items-center gap-1"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                    <span>Photo</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Text Input */}
                            <TabsContent
                                value="text"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="text-prompt">
                                        Text Description
                                    </Label>
                                    <Textarea
                                        id="text-prompt"
                                        placeholder="Describe your building or space in detail..."
                                        className="min-h-[200px] resize-none"
                                        value={textPrompt}
                                        onChange={handleTextChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Example Prompts</Label>
                                    <div className="space-y-2">
                                        {examplePrompts.map(
                                            (example, index) => (
                                                <div
                                                    key={index}
                                                    className="text-sm p-2 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                                                    onClick={() =>
                                                        handleExampleClick(
                                                            example
                                                        )
                                                    }
                                                >
                                                    {example}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Sketch Input */}
                            <TabsContent
                                value="sketch"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Draw Your Floor Plan</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (canvasRef.current) {
                                                        const canvasElement =
                                                            canvasRef.current.getCanvasElement();
                                                        if (
                                                            canvasElement &&
                                                            canvasElement.parentElement
                                                        ) {
                                                            canvasElement.parentElement.requestFullscreen();
                                                        }
                                                    }
                                                }}
                                                className="flex gap-1 items-center"
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                                Fullscreen
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearSketch}
                                                className="flex gap-1 items-center"
                                            >
                                                <Trash className="h-3.5 w-3.5" />
                                                Clear Sketch
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="border rounded-md overflow-hidden bg-white h-[350px] md:h-[400px]">
                                        <DesignCanvas
                                            projectId="multimodal-input"
                                            ref={canvasRef}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Draw a floor plan or sketch of your
                                        design. Use the tools above to create
                                        your sketch.
                                    </p>
                                </div>
                            </TabsContent>

                            {/* Speech Input */}
                            <TabsContent
                                value="speech"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Voice Description</Label>
                                        {!isRecording && (
                                            <Button
                                                onClick={startRecording}
                                                variant="outline"
                                                size="sm"
                                                className="flex gap-1 items-center"
                                                disabled={isRecording}
                                            >
                                                <Mic className="h-3.5 w-3.5" />
                                                Start Recording
                                            </Button>
                                        )}
                                        {isRecording && (
                                            <div className="flex gap-2 items-center">
                                                <div className="text-sm text-red-500 animate-pulse flex items-center">
                                                    <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                                                    Recording:{" "}
                                                    {formatTime(recordingTime)}
                                                </div>
                                                <Button
                                                    onClick={stopRecording}
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex gap-1 items-center"
                                                >
                                                    <Square className="h-3.5 w-3.5" />
                                                    Stop
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {speechTranscript ? (
                                        <div className="relative border rounded-md p-3 bg-muted/30">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-5 w-5"
                                                onClick={() =>
                                                    setSpeechTranscript("")
                                                }
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                            <Label className="text-xs font-medium">
                                                Transcribed Speech:
                                            </Label>
                                            <p className="mt-1 text-sm">
                                                {speechTranscript}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-20 border rounded-md">
                                            <p className="text-sm text-muted-foreground">
                                                {isRecording
                                                    ? "Listening..."
                                                    : "Click 'Start Recording' and describe your architectural requirements"}
                                            </p>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Speak clearly and describe your building
                                        requirements in detail. Include room
                                        types, dimensions, layout preferences,
                                        and any special features.
                                    </p>
                                </div>
                            </TabsContent>

                            {/* Photo Input */}
                            <TabsContent
                                value="photo"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Capture Space Photo</Label>
                                        {!isCameraActive && !photoData && (
                                            <Button
                                                onClick={activateCamera}
                                                variant="outline"
                                                size="sm"
                                                className="flex gap-1 items-center"
                                            >
                                                <Camera className="h-3.5 w-3.5" />
                                                Activate Camera
                                            </Button>
                                        )}
                                        {isCameraActive && (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={capturePhoto}
                                                    variant="default"
                                                    size="sm"
                                                    className="flex gap-1 items-center"
                                                >
                                                    <Camera className="h-3.5 w-3.5" />
                                                    Capture
                                                </Button>
                                                <Button
                                                    onClick={deactivateCamera}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        )}
                                        {photoData && (
                                            <Button
                                                onClick={clearPhoto}
                                                variant="outline"
                                                size="sm"
                                                className="flex gap-1 items-center"
                                            >
                                                <Trash className="h-3.5 w-3.5" />
                                                Clear Photo
                                            </Button>
                                        )}
                                    </div>

                                    <div className="relative border rounded-md overflow-hidden bg-black h-[300px] md:h-[400px] flex items-center justify-center">
                                        {isCameraActive && (
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        )}
                                        {photoData && (
                                            <img
                                                src={
                                                    photoData ||
                                                    "/placeholder.svg"
                                                }
                                                alt="Captured space"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        )}
                                        {!isCameraActive && !photoData && (
                                            <p className="text-white/70 text-sm">
                                                No photo captured. Click
                                                "Activate Camera" to take a
                                                photo.
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        Take a photo of an existing space for
                                        reference or inspiration. Our AI will
                                        analyze the architectural elements and
                                        incorporate them into the design.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <Separator />

                {/* Input summary and submit button */}
                <div className="pt-3 border-t">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {textPrompt && (
                            <div className="bg-primary/10 text-xs py-1 px-2 rounded-full flex items-center">
                                <Wand2 className="h-3 w-3 mr-1" />
                                <span>Text Input</span>
                                <Check className="h-3 w-3 ml-1 text-green-600" />
                            </div>
                        )}
                        {activeTab === "sketch" && (
                            <div className="bg-primary/10 text-xs py-1 px-2 rounded-full flex items-center">
                                <Pencil className="h-3 w-3 mr-1" />
                                <span>Sketch Input</span>
                                <Check className="h-3 w-3 ml-1 text-green-600" />
                            </div>
                        )}
                        {speechTranscript && (
                            <div className="bg-primary/10 text-xs py-1 px-2 rounded-full flex items-center">
                                <Mic className="h-3 w-3 mr-1" />
                                <span>Voice Input</span>
                                <Check className="h-3 w-3 ml-1 text-green-600" />
                            </div>
                        )}
                        {photoData && (
                            <div className="bg-primary/10 text-xs py-1 px-2 rounded-full flex items-center">
                                <Camera className="h-3 w-3 mr-1" />
                                <span>Photo Input</span>
                                <Check className="h-3 w-3 ml-1 text-green-600" />
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={
                            isGenerating ||
                            (!textPrompt &&
                                !speechTranscript &&
                                activeTab !== "sketch" &&
                                !photoData)
                        }
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating Model...
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generate 3D Model
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
