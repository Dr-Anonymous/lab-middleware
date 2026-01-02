const axios = require('axios');
const { getNextBatch, markComplete, markFailed } = require('../database/db');
const logger = require('../utils/logger');
require('dotenv').config();

const BATCH_SIZE = 10;
const POLL_INTERVAL = 5000; // 5 seconds

async function processQueue() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        logger.error("Missing Supabase Config. Uploader paused.");
        return;
    }

    const batch = getNextBatch(BATCH_SIZE);
    if (batch.length === 0) return; // Nothing to do

    logger.info(`Processing batch of ${batch.length} results...`);

    for (const item of batch) {
        try {
            const payload = JSON.parse(item.payload);

            // Push to valid endpoint
            const url = `${process.env.SUPABASE_URL}/functions/v1/receive-machine-data`;

            await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            markComplete(item.id);
            logger.info(`Uploaded Result ID ${item.id} (SID: ${payload.sample_id})`);

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
            logger.error(`Upload failed for ID ${item.id}: ${msg}`);
            markFailed(item.id, msg);
        }
    }
}

function startUploader() {
    setInterval(processQueue, POLL_INTERVAL);
    logger.info("Cloud Uploader Service started.");
}

module.exports = { startUploader };
