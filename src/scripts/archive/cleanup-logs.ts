import fs from 'fs';
import path from 'path';

/**
 * Cleanup Logs Script
 * Detects and clears/archives large .txt log files in the root directory.
 */

const LOG_FILES = [
    'server_logs.txt',
    'server_logs1.txt',
    'server_logs2.txt',
    'server_logs3.txt',
    'server_logs4.txt',
    'server_logs5.txt',
    'server_logs6.txt',
    'server_logs7.txt',
    'server_logs8.txt',
    'server_logs9.txt',
    'server_logs10.txt',
    'errors.txt',
    'errors2.txt',
    'errors3.txt',
    'seed_out.txt',
    'storefront_logs.txt',
    'build_logs.txt'
];

const ROOT_DIR = process.cwd();

async function cleanup() {
    console.log('--- Log Cleanup Started ---');

    for (const file of LOG_FILES) {
        const filePath = path.join(ROOT_DIR, file);

        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log(`Found: ${file} (${sizeMB} MB)`);

            try {
                // Clear the file content
                fs.writeFileSync(filePath, '', 'utf8');
                console.log(`Successfully cleared: ${file}`);
            } catch (error) {
                console.error(`Failed to clear ${file}:`, error);
            }
        }
    }

    console.log('--- Log Cleanup Finished ---');
}

cleanup();
