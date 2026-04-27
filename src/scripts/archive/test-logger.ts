import logger from '../lib/logger';

async function testLogger() {
    console.log('--- Logger Test Started ---');

    logger.info('This is an info log message from the test script.');
    logger.error('This is an error log message from the test script.', { details: 'Some error details' });
    logger.debug('This is a debug log message from the test script.');

    console.log('Logs should have been written to the /logs directory.');
    console.log('--- Logger Test Finished ---');
}

testLogger();
