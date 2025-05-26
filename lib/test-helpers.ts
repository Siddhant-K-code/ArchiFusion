/**
 * Helper functions for testing timeout scenarios
 */

// Simulate slow network by adding artificial delay
export function addNetworkDelay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create large test data to trigger timeouts
export function createLargeSketchData(sizeKB: number = 100): string {
    const base64Padding = "x".repeat(sizeKB * 1024);
    return `data:image/png;base64,${base64Padding}`;
}

// Create mock photo data
export function createMockPhotoData(): string {
    // Small valid base64 image (1x1 pixel PNG)
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
}

// Monitor request performance
export class RequestMonitor {
    private startTime: number = 0;
    
    start() {
        this.startTime = performance.now();
    }
    
    end() {
        return performance.now() - this.startTime;
    }
    
    static async timeRequest<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        return { result, duration };
    }
}

// Test different timeout scenarios
export const timeoutTestCases = [
    {
        name: "Quick text generation",
        data: { prompt: "Simple house" },
        expectedDuration: 3000,
        shouldSucceed: true
    },
    {
        name: "Complex multimodal input", 
        data: {
            prompt: "Complex architectural design with multiple floors",
            sketchData: createLargeSketchData(50),
            photoData: createMockPhotoData()
        },
        expectedDuration: 20000,
        shouldSucceed: true
    },
    {
        name: "Oversized sketch data",
        data: {
            prompt: "House from sketch",
            sketchData: createLargeSketchData(200) // Very large
        },
        expectedDuration: 25000,
        shouldSucceed: false // Should trigger timeout handling
    }
];

// Browser performance testing
export function measurePagePerformance() {
    if (typeof window === 'undefined') return null;
    
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.navigationStart,
        ttfb: navigation.responseStart - navigation.requestStart
    };
}

// Network connection quality detection
export function getConnectionInfo() {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
        return { effectiveType: 'unknown', downlink: null };
    }
    
    const conn = (navigator as any).connection;
    return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt
    };
}

// Timeout handler with exponential backoff
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await addNetworkDelay(delay);
        }
    }
    
    throw lastError!;
}