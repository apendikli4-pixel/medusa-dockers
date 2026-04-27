
import { getClientIp } from '../utils/get-client-ip';

async function testIpExtraction() {
    console.log("--- Testing IP Extraction ---");
    const testCases = [
        { context: { headers: { "x-forwarded-for": "88.249.10.5, 10.0.0.1" } }, expected: "88.249.10.5" },
        { context: { headers: { "x-real-ip": "1.2.3.4" } }, expected: "1.2.3.4" },
        { context: { headers: { "cf-connecting-ip": "5.6.7.8" } }, expected: "5.6.7.8" },
        { context: {}, expected: "127.0.0.1" }
    ];

    testCases.forEach((tc, i) => {
        const result = getClientIp(tc.context);
        console.log(`Test ${i + 1}: ${result === tc.expected ? "PASS" : "FAIL"} (Result: ${result}, Expected: ${tc.expected})`);
    });
}

testIpExtraction();
