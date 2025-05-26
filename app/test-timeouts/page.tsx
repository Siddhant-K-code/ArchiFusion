'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestResult {
    name: string;
    success: boolean;
    duration: number;
    error?: string;
    endpoint: string;
}

export default function TestTimeoutsPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const [currentTest, setCurrentTest] = useState('');
    const [progress, setProgress] = useState(0);

    const testCases = [
        {
            name: "Simple text input",
            data: { prompt: "Create a simple 2-bedroom house" },
            endpoints: ['/api/cad-generator', '/api/multimodal-processor', '/api/quick-generate']
        },
        {
            name: "Large text input",
            data: { prompt: "Create a complex building with ".repeat(500) + "many features" },
            endpoints: ['/api/cad-generator', '/api/multimodal-processor']
        },
        {
            name: "Text + sketch data",
            data: {
                prompt: "Create a house from this sketch",
                sketchData: "data:image/png;base64," + "x".repeat(50000)
            },
            endpoints: ['/api/multimodal-processor']
        },
        {
            name: "Multimodal input (all types)",
            data: {
                prompt: "Create a modern office",
                sketchData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                speechData: "I want a modern office building",
                photoData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            },
            endpoints: ['/api/multimodal-processor', '/api/stream-processor']
        }
    ];

    const runTest = async (endpoint: string, data: any, testName: string): Promise<TestResult> => {
        const startTime = Date.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            if (response.ok) {
                const result = await response.json();
                return {
                    name: testName,
                    success: true,
                    duration,
                    endpoint
                };
            } else {
                const errorText = await response.text();
                return {
                    name: testName,
                    success: false,
                    duration,
                    error: `HTTP ${response.status}: ${errorText}`,
                    endpoint
                };
            }
        } catch (error: any) {
            const duration = Date.now() - startTime;
            return {
                name: testName,
                success: false,
                duration,
                error: error.message,
                endpoint
            };
        }
    };

    const runStreamingTest = async (data: any, testName: string): Promise<TestResult> => {
        const startTime = Date.now();
        
        try {
            const response = await fetch('/api/stream-processor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let result = null;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.status === 'completed' && data.result) {
                                    result = data.result;
                                } else if (data.status === 'error') {
                                    throw new Error(data.error);
                                }
                            } catch (parseError) {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            }

            const duration = Date.now() - startTime;
            return {
                name: testName,
                success: !!result,
                duration,
                endpoint: '/api/stream-processor'
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            return {
                name: testName,
                success: false,
                duration,
                error: error.message,
                endpoint: '/api/stream-processor'
            };
        }
    };

    const runAllTests = async () => {
        setIsRunning(true);
        setResults([]);
        setProgress(0);

        const allTests: Promise<TestResult>[] = [];
        
        // Calculate total tests
        const totalTests = testCases.reduce((sum, testCase) => sum + testCase.endpoints.length, 0) + 
                          testCases.filter(tc => tc.endpoints.includes('/api/stream-processor')).length;

        let completedTests = 0;

        for (const testCase of testCases) {
            setCurrentTest(testCase.name);

            // Run regular API tests
            for (const endpoint of testCase.endpoints) {
                if (endpoint !== '/api/stream-processor') {
                    const testPromise = runTest(endpoint, testCase.data, `${testCase.name} (${endpoint})`);
                    allTests.push(testPromise);
                    
                    testPromise.then(result => {
                        completedTests++;
                        setProgress((completedTests / totalTests) * 100);
                        setResults(prev => [...prev, result]);
                    });
                }
            }

            // Run streaming test if applicable
            if (testCase.endpoints.includes('/api/stream-processor')) {
                const streamPromise = runStreamingTest(testCase.data, `${testCase.name} (streaming)`);
                allTests.push(streamPromise);
                
                streamPromise.then(result => {
                    completedTests++;
                    setProgress((completedTests / totalTests) * 100);
                    setResults(prev => [...prev, result]);
                });
            }
        }

        await Promise.all(allTests);
        setIsRunning(false);
        setCurrentTest('');
    };

    const getStatusBadge = (result: TestResult) => {
        if (result.success) {
            if (result.duration < 5000) return <Badge className="bg-green-500">Fast</Badge>;
            if (result.duration < 15000) return <Badge className="bg-yellow-500">Moderate</Badge>;
            return <Badge className="bg-orange-500">Slow</Badge>;
        }
        
        if (result.error?.includes('timeout') || result.error?.includes('AbortError')) {
            return <Badge variant="destructive">Timeout</Badge>;
        }
        
        return <Badge variant="destructive">Error</Badge>;
    };

    const successRate = results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0;
    const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;
    const timeoutCount = results.filter(r => r.error?.includes('timeout') || r.error?.includes('AbortError')).length;

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Timeout Testing Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Test API endpoints for timeout handling and performance
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Test Controls</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Button 
                            onClick={runAllTests} 
                            disabled={isRunning}
                            className="w-full"
                        >
                            {isRunning ? 'Running Tests...' : 'Run All Tests'}
                        </Button>
                        
                        {isRunning && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Current: {currentTest}</span>
                                    <span>{progress.toFixed(0)}%</span>
                                </div>
                                <Progress value={progress} />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Success Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {successRate.toFixed(1)}%
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {results.filter(r => r.success).length} / {results.length} tests passed
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Avg Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {avgDuration ? `${avgDuration.toFixed(0)}ms` : 'N/A'}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                For successful requests
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Timeouts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {timeoutCount}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Timeout incidents detected
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded">
                                    <div className="flex-1">
                                        <div className="font-medium">{result.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {result.endpoint} • {result.duration}ms
                                        </div>
                                        {result.error && (
                                            <div className="text-sm text-red-600 mt-1">
                                                {result.error}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        {getStatusBadge(result)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}