import { useState, useEffect, useCallback, useRef } from 'react';

interface CADJobResult {
    jobId?: string;
    status: 'idle' | 'queued' | 'processing' | 'analyzing_inputs' | 'generating_model' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
    elapsed?: number;
}

export function useCADJob() {
    const [job, setJob] = useState<CADJobResult>({ status: 'idle' });
    const [isPolling, setIsPolling] = useState(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout>();

    const startJob = useCallback(async (data: {
        prompt?: string;
        sketchData?: string;
        speechData?: string;
        photoData?: string;
    }) => {
        try {
            setJob({ status: 'queued', progress: 0 });
            
            const response = await fetch('/api/cad-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start job');
            }
            
            const { jobId } = await response.json();
            setJob({ jobId, status: 'queued', progress: 0 });
            setIsPolling(true);
            
        } catch (error) {
            setJob({ 
                status: 'failed', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    }, []);

    const cancelJob = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        setIsPolling(false);
        setJob({ status: 'idle' });
    }, []);

    const resetJob = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        setIsPolling(false);
        setJob({ status: 'idle' });
    }, []);

    // Poll for job status
    useEffect(() => {
        if (!isPolling || !job.jobId) return;

        const pollForStatus = async () => {
            try {
                const response = await fetch(`/api/cad-generator?jobId=${job.jobId}`);
                if (!response.ok) throw new Error('Failed to get job status');
                
                const jobStatus = await response.json();
                setJob(prev => ({ ...prev, ...jobStatus }));
                
                if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
                    setIsPolling(false);
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                    }
                }
                
            } catch (error) {
                console.error('Polling error:', error);
                setJob(prev => ({ 
                    ...prev, 
                    status: 'failed', 
                    error: 'Failed to check job status' 
                }));
                setIsPolling(false);
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            }
        };

        // Initial poll
        pollForStatus();
        
        // Set up interval polling
        pollingIntervalRef.current = setInterval(pollForStatus, 2000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isPolling, job.jobId]);

    return { 
        job, 
        startJob, 
        cancelJob, 
        resetJob, 
        isPolling,
        isProcessing: ['queued', 'processing', 'analyzing_inputs', 'generating_model'].includes(job.status)
    };
}
