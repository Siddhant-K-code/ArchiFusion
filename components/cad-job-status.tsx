"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Loader2, Zap } from "lucide-react";

interface CADJobStatusProps {
    jobId: string;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

interface JobStatus {
    status: string;
    progress?: number;
    result?: any;
    error?: string;
    elapsed?: number;
}

const statusMessages = {
    queued: "Your CAD generation request is queued",
    processing: "Initializing CAD generation engine",
    analyzing_inputs: "Analyzing your design inputs",
    generating_model: "Generating 3D architectural model",
    completed: "CAD model generated successfully!",
    failed: "Generation failed"
};

const statusIcons = {
    queued: Clock,
    processing: Loader2,
    analyzing_inputs: Zap,
    generating_model: Loader2,
    completed: CheckCircle,
    failed: AlertCircle
};

export function CADJobStatus({ jobId, onComplete, onError, onCancel }: CADJobStatusProps) {
    const [job, setJob] = useState<JobStatus>({ status: "queued", progress: 0 });
    const [isPolling, setIsPolling] = useState(true);

    useEffect(() => {
        if (!isPolling || !jobId) return;

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/cad-generator?jobId=${jobId}`);
                if (!response.ok) throw new Error('Failed to get job status');
                
                const jobStatus = await response.json();
                setJob(jobStatus);
                
                if (jobStatus.status === 'completed') {
                    setIsPolling(false);
                    onComplete?.(jobStatus.result);
                } else if (jobStatus.status === 'failed') {
                    setIsPolling(false);
                    onError?.(jobStatus.error || 'Unknown error occurred');
                }
                
            } catch (error) {
                console.error('Polling error:', error);
                setIsPolling(false);
                onError?.('Failed to check job status');
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [isPolling, jobId, onComplete, onError]);

    const formatElapsedTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            case 'processing':
            case 'analyzing_inputs':
            case 'generating_model': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const StatusIcon = statusIcons[job.status as keyof typeof statusIcons] || Clock;
    const isProcessing = ['queued', 'processing', 'analyzing_inputs', 'generating_model'].includes(job.status);

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                    <div className={`p-3 rounded-full ${getStatusColor(job.status)}`}>
                        <StatusIcon 
                            className={`h-6 w-6 text-white ${isProcessing ? 'animate-spin' : ''}`} 
                        />
                    </div>
                </div>
                <CardTitle className="text-lg">
                    {job.status === 'completed' ? 'Generation Complete!' : 'Generating CAD Model'}
                </CardTitle>
                <CardDescription>
                    {statusMessages[job.status as keyof typeof statusMessages] || 'Processing...'}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{job.progress || 0}%</span>
                    </div>
                    <Progress 
                        value={job.progress || 0} 
                        className="h-2"
                    />
                </div>

                {/* Status Badge and Timer */}
                <div className="flex items-center justify-between">
                    <Badge 
                        variant={job.status === 'completed' ? 'default' : 'secondary'}
                        className={job.status === 'completed' ? 'bg-green-500' : ''}
                    >
                        {job.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    
                    {job.elapsed && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatElapsedTime(job.elapsed)}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {job.status === 'failed' && job.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">{job.error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    {isProcessing && onCancel && (
                        <Button 
                            variant="outline" 
                            onClick={onCancel}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    )}
                    
                    {job.status === 'failed' && (
                        <Button 
                            variant="outline" 
                            onClick={() => window.location.reload()}
                            className="flex-1"
                        >
                            Try Again
                        </Button>
                    )}
                </div>

                {/* Estimated Time */}
                {isProcessing && (
                    <div className="text-xs text-center text-muted-foreground">
                        Estimated time: 30-60 seconds
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
