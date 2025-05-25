"use client";

import type React from "react";

import {
    useRef,
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import {
    Eraser,
    Pencil,
    Square,
    Circle,
    RotateCw,
    Undo,
    Hand,
} from "lucide-react";

interface DesignCanvasProps {
    projectId: string;
}

export const DesignCanvas = forwardRef<any, DesignCanvasProps>(
    ({ projectId }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [context, setContext] = useState<CanvasRenderingContext2D | null>(
            null
        );
        const [isDrawing, setIsDrawing] = useState(false);
        const [tool, setTool] = useState<
            "pencil" | "eraser" | "rectangle" | "circle" | "pan"
        >("pencil");
        const [lastX, setLastX] = useState(0);
        const [lastY, setLastY] = useState(0);
        const [history, setHistory] = useState<ImageData[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);

        // Expose the canvas element and methods to parent components
        useImperativeHandle(ref, () => ({
            getCanvasElement: () => canvasRef.current,
            clearCanvas: () => {
                if (context && canvasRef.current) {
                    context.clearRect(
                        0,
                        0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    );
                    // Reset history
                    const initialState = context.getImageData(
                        0,
                        0,
                        canvasRef.current.width,
                        canvasRef.current.height
                    );
                    setHistory([initialState]);
                    setHistoryIndex(0);
                }
            },
        }));

        useEffect(() => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    setContext(ctx);
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 2;
                    ctx.lineCap = "round";

                    // Set canvas size to fill container
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;

                    // Save initial canvas state
                    const initialState = ctx.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );
                    setHistory([initialState]);
                    setHistoryIndex(0);
                }
            }
        }, []);

        const saveState = () => {
            if (context && canvasRef.current) {
                const canvas = canvasRef.current;
                const currentState = context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                // Remove states after current history index
                const newHistory = history.slice(0, historyIndex + 1);

                setHistory([...newHistory, currentState]);
                setHistoryIndex(newHistory.length);
            }
        };

        const undo = () => {
            if (historyIndex > 0 && context && canvasRef.current) {
                const newIndex = historyIndex - 1;
                context.putImageData(history[newIndex], 0, 0);
                setHistoryIndex(newIndex);
            }
        };

        const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!context || !canvasRef.current) return;

            setIsDrawing(true);

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setLastX(x);
            setLastY(y);

            if (tool === "pencil" || tool === "eraser") {
                context.beginPath();
                context.moveTo(x, y);
            }
        };

        const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing || !context || !canvasRef.current) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (tool === "pencil") {
                context.strokeStyle = "#000000";
                context.lineTo(x, y);
                context.stroke();
            } else if (tool === "eraser") {
                context.strokeStyle = "#ffffff";
                context.lineTo(x, y);
                context.stroke();
            } else if (tool === "rectangle") {
                // Redraw from saved state to avoid multiple overlapping shapes
                if (historyIndex >= 0) {
                    context.putImageData(history[historyIndex], 0, 0);
                }
                context.strokeStyle = "#000000";
                context.beginPath();
                context.rect(lastX, lastY, x - lastX, y - lastY);
                context.stroke();
            } else if (tool === "circle") {
                if (historyIndex >= 0) {
                    context.putImageData(history[historyIndex], 0, 0);
                }
                context.strokeStyle = "#000000";
                context.beginPath();
                const radius = Math.sqrt(
                    Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2)
                );
                context.arc(lastX, lastY, radius, 0, 2 * Math.PI);
                context.stroke();
            }
        };

        const handleMouseUp = () => {
            if (isDrawing) {
                setIsDrawing(false);
                saveState();
            }
        };

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex space-x-1 bg-secondary rounded-md p-1">
                        <Button
                            variant={tool === "pencil" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTool("pencil")}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === "eraser" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTool("eraser")}
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === "rectangle" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTool("rectangle")}
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === "circle" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTool("circle")}
                        >
                            <Circle className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={tool === "pan" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTool("pan")}
                        >
                            <Hand className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex space-x-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                        >
                            <Undo className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 border rounded-md bg-white overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>
            </div>
        );
    }
);

DesignCanvas.displayName = "DesignCanvas";
