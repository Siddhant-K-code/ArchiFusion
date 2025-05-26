'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ProcessingResult {
    modelData?: any;
    code?: string;
    metadata?: any;
}

interface ResilientProcessorProps {
    onResult: (result: ProcessingResult) => void;
    onError: (error: string) => void;
}

export function ResilientProcessor({ onResult, onError }: ResilientProcessorProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    const processWithRetry = useCallback(async (
        data: { text?: string; sketch?: string; speech?: string; photo?: string },
        maxRetries = 2
    ) => {
        setIsProcessing(true);
        setProgress(0);
        setCurrentStep('Starting...');

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                setRetryCount(attempt);
                if (attempt > 0) {
                    setCurrentStep(`Retry attempt ${attempt}...`);
                    setProgress(5);
                }

                // First try streaming API for better UX
                const result = await processWithStreaming(data);
                if (result) {
                    onResult(result);
                    return;
                }

                // Fallback to chunked processing
                const chunkResult = await processInChunks(data);
                onResult(chunkResult);
                return;

            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                
                if (attempt === maxRetries) {
                    // Final attempt - try lightweight fallback
                    try {
                        const fallbackResult = await processFallback(data);
                        onResult(fallbackResult);
                        return;
                    } catch (fallbackError) {
                        onError(`Processing failed after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`);
                    }
                } else {
                    // Wait before retry with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
    }, [onResult, onError]);

    const processWithStreaming = async (data: any): Promise<ProcessingResult | null> => {
        try {
            const response = await fetch('/api/stream-processor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            let result: ProcessingResult | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.progress) setProgress(data.progress);
                            if (data.step) setCurrentStep(data.step);
                            
                            if (data.status === 'completed' && data.result) {
                                result = data.result;
                            } else if (data.status === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse streaming data:', parseError);
                        }
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('Streaming failed:', error);
            return null;
        }
    };

    const processInChunks = async (data: any): Promise<ProcessingResult> => {
        // Process inputs separately to reduce individual request time
        setCurrentStep('Processing text and basic inputs...');
        setProgress(20);

        const basicResult = await fetch('/api/cad-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: data.text || 'Generate a basic architectural model',
                sketchData: data.sketch && data.sketch.length < 50000 ? data.sketch : null // Limit sketch size
            }),
            signal: AbortSignal.timeout(20000) // 20 second timeout
        });

        if (!basicResult.ok) {
            throw new Error(`Basic processing failed: ${basicResult.status}`);
        }

        setProgress(100);
        setCurrentStep('Completed');
        
        return await basicResult.json();
    };

    const processFallback = async (data: any): Promise<ProcessingResult> => {
        setCurrentStep('Using lightweight fallback...');
        setProgress(50);

        // Simple fallback with minimal processing
        const response = await fetch('/api/cad-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: data.text || 'Generate a simple house model'
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            throw new Error('Fallback processing failed');
        }

        setProgress(100);
        setCurrentStep('Fallback completed');
        
        return await response.json();
    };

    return (
        <div className="space-y-4">
            {isProcessing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>{currentStep}</span>
                        {retryCount > 0 && <span>Retry {retryCount}</span>}
                    </div>
                    <Progress value={progress} className="w-full" />
                </div>
            )}
        </div>
    );
}