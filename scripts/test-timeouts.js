#!/usr/bin/env node

/**
 * Test script to simulate various timeout scenarios
 * Run with: node scripts/test-timeouts.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testCases = [
    {
        name: "Text only (should be fast)",
        data: {
            prompt: "Create a simple 2-bedroom house"
        },
        expectedTime: 5000
    },
    {
        name: "Large text input (potential timeout)",
        data: {
            prompt: "Create a massive commercial complex with ".repeat(1000) + "many rooms"
        },
        expectedTime: 10000
    },
    {
        name: "Text + Large sketch data (should trigger timeout handling)",
        data: {
            prompt: "Create a house based on this sketch",
            sketchData: "data:image/png;base64," + "x".repeat(100000) // Large fake sketch
        },
        expectedTime: 15000
    },
    {
        name: "All inputs (maximum processing)",
        data: {
            prompt: "Create a comprehensive building",
            sketchData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            speechData: "I want a modern office building",
            photoData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        },
        expectedTime: 25000
    }
];

async function testEndpoint(endpoint, data, testName) {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log(`📡 Endpoint: ${endpoint}`);
    
    const startTime = Date.now();
    let response;
    let success = false;
    let error = null;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s max

        response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (response.ok) {
            const result = await response.json();
            success = true;
            console.log(`✅ Success in ${duration}ms`);
            console.log(`📊 Result type: ${result.metadata?.type || 'standard'}`);
            console.log(`🏠 Rooms generated: ${result.modelData?.rooms?.length || 0}`);
        } else {
            const errorText = await response.text();
            error = `HTTP ${response.status}: ${errorText}`;
            console.log(`❌ Failed in ${duration}ms - ${error}`);
        }

        return { success, duration, error, response };

    } catch (fetchError) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        error = fetchError.message;
        
        if (fetchError.name === 'AbortError') {
            console.log(`⏰ Timeout after ${duration}ms`);
        } else {
            console.log(`💥 Error in ${duration}ms - ${error}`);
        }

        return { success: false, duration, error };
    }
}

async function testStreamingEndpoint(data, testName) {
    console.log(`\n🌊 Testing Streaming: ${testName}`);
    
    const startTime = Date.now();
    let success = false;
    let error = null;
    let finalResult = null;

    try {
        const response = await fetch(`${BASE_URL}/api/stream-processor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('No response body');
        }

        let progress = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.progress && data.progress > progress) {
                            progress = data.progress;
                            console.log(`📈 Progress: ${progress}% - ${data.step || ''}`);
                        }
                        
                        if (data.status === 'completed' && data.result) {
                            finalResult = data.result;
                            success = true;
                        } else if (data.status === 'error') {
                            throw new Error(data.error);
                        }
                    } catch (parseError) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (success && finalResult) {
            console.log(`✅ Streaming completed in ${duration}ms`);
            console.log(`🏠 Rooms generated: ${finalResult.modelData?.rooms?.length || 0}`);
        } else {
            console.log(`❌ Streaming failed - no final result`);
        }

        return { success, duration, error, result: finalResult };

    } catch (streamError) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        error = streamError.message;
        console.log(`💥 Streaming error in ${duration}ms - ${error}`);
        
        return { success: false, duration, error };
    }
}

async function runAllTests() {
    console.log('🚀 Starting timeout testing...');
    console.log(`🎯 Target server: ${BASE_URL}`);
    
    // Test if server is running
    try {
        const healthCheck = await fetch(BASE_URL);
        if (!healthCheck.ok) {
            throw new Error(`Server returned ${healthCheck.status}`);
        }
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server is not running. Start with: npm run dev');
        process.exit(1);
    }

    const results = {
        regular: [],
        streaming: [],
        quickGenerate: []
    };

    // Test regular API endpoints
    for (const testCase of testCases) {
        console.log('\n' + '='.repeat(60));
        
        // Test multimodal processor
        const multimodalResult = await testEndpoint(
            '/api/multimodal-processor', 
            testCase.data, 
            `Multimodal: ${testCase.name}`
        );
        results.regular.push({...multimodalResult, testName: testCase.name, endpoint: 'multimodal'});

        // Test CAD generator  
        const cadResult = await testEndpoint(
            '/api/cad-generator', 
            testCase.data, 
            `CAD Generator: ${testCase.name}`
        );
        results.regular.push({...cadResult, testName: testCase.name, endpoint: 'cad-generator'});

        // Test streaming
        const streamResult = await testStreamingEndpoint(
            testCase.data, 
            testCase.name
        );
        results.streaming.push({...streamResult, testName: testCase.name});

        // Test quick generate for comparison
        const quickResult = await testEndpoint(
            '/api/quick-generate', 
            { prompt: testCase.data.prompt }, 
            `Quick Generate: ${testCase.name}`
        );
        results.quickGenerate.push({...quickResult, testName: testCase.name});
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    console.log('\n🔄 Regular APIs:');
    results.regular.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.endpoint}/${result.testName}: ${result.duration}ms`);
    });

    console.log('\n🌊 Streaming API:');
    results.streaming.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.duration}ms`);
    });

    console.log('\n⚡ Quick Generate API:');
    results.quickGenerate.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.duration}ms`);
    });

    // Performance analysis
    const avgRegular = results.regular.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.regular.filter(r => r.success).length;
    const avgStreaming = results.streaming.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.streaming.filter(r => r.success).length;
    const avgQuick = results.quickGenerate.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / results.quickGenerate.filter(r => r.success).length;

    console.log('\n📈 Performance Analysis:');
    console.log(`Average Regular API time: ${avgRegular?.toFixed(0) || 'N/A'}ms`);
    console.log(`Average Streaming API time: ${avgStreaming?.toFixed(0) || 'N/A'}ms`);
    console.log(`Average Quick Generate time: ${avgQuick?.toFixed(0) || 'N/A'}ms`);

    const timeoutCount = [...results.regular, ...results.streaming].filter(r => r.error?.includes('timeout') || r.error?.includes('AbortError')).length;
    console.log(`\n⏰ Timeout incidents: ${timeoutCount}`);
    
    if (timeoutCount === 0) {
        console.log('🎉 All requests completed within timeout limits!');
    } else {
        console.log('⚠️  Some requests timed out - timeout handling is working');
    }
}

// Run the tests
runAllTests().catch(console.error);