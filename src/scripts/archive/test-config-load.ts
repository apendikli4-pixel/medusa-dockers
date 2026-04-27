import * as path from 'path';

async function test() {
    try {
        const configPath = path.resolve(process.cwd(), 'medusa-config.ts');
        console.log('Attempting to load medusa-config.ts from:', configPath);
        const config = require(configPath);
        console.log('medusa-config.ts loaded successfully.');
        // console.log('Config keys:', Object.keys(config));
    } catch (error) {
        console.error('Config load failed:', error);
        process.exit(1);
    }
}

test();
