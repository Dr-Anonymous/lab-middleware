const { startTcpServer } = require('./listeners/tcp');
const { startUploader } = require('./services/uploader');
const logger = require('./utils/logger');
const express = require('express');
const { getDb } = require('./database/db');
const _ = require('underscore');
require('dotenv').config();

logger.info("--- LAB MIDDLEWARE STARTING ---");

// 1. Start Listeners
// Based on user requirements
try {
    // Coralyzer Smart (Port 50001, ASTM/TCP)
    startTcpServer(50001, 'ASTM');

    // Maglumi 800 (Port 2001, Need to confirm protocol, typically ASTM or HL7. User screenshot says "Protocol: None" but that might be selected. Let's assume ASTM for now based on screen)
    // Wait, the Maglumi screen shows "Protocol: None" selected, but options are ASTM(COM), ASTM(TCP), HL7(COM), HL7(TCP). 
    // Usually Maglumi uses ASTM. I'll open port 2001 as ASTM.
    startTcpServer(2001, 'ASTM');

    // Medsource Ozonebio Csense 120 Auto Chemistry Analyzer (Port 1109)
    startTcpServer(1109, 'ASTM');

} catch (e) {
    logger.error("Failed to start listeners: " + e.message);
}

// 2. Start Cloud Uploader
startUploader();

// 3. Start Local Dashboard
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    const db = getDb();
    const recent = db.prepare("SELECT * FROM result_queue ORDER BY created_at DESC LIMIT 20").all();
    const pending = db.prepare("SELECT COUNT(*) as count FROM result_queue WHERE status='PENDING'").get().count;

    let html = `
    <html>
        <head>
            <title>Lab Middleware</title>
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: sans-serif; padding: 20px; background: #f0f2f5; }
                .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                h1 { margin-top: 0; color: #1a1a1a; }
                .stat { font-size: 24px; font-weight: bold; color: #0066cc; }
                table { width: 100%; border-collapse: collapse; }
                th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
                .status-PENDING { color: orange; }
                .status-COMPLETED { color: green; }
                .logs { font-family: monospace; font-size: 12px; background: #333; color: #0f0; padding: 10px; border-radius: 4px; height: 200px; overflow-y: auto; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🏥 Lab Middleware Status</h1>
                <p>Status: <span style="color:green">● Online</span> | Uptime: ${process.uptime().toFixed(0)}s</p>
                <div style="display:flex; gap: 20px;">
                    <div>
                        <div class="stat">${pending}</div>
                        <div>Pending Upload</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                 <h2>Recent Activity</h2>
                 <table>
                    <thead>
                        <tr><th>ID</th><th>Received</th><th>Status</th><th>Payload Snippet</th></tr>
                    </thead>
                    <tbody>
                        ${recent.map(r => `
                            <tr>
                                <td>${r.id}</td>
                                <td>${r.created_at}</td>
                                <td class="status-${r.status}">${r.status} ${r.retries > 0 ? `(Retry ${r.retries})` : ''}</td>
                                <td>${r.payload ? _.escape(r.payload.substring(0, 50)) + '...' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                 </table>
            </div>
            
            <div class="card">
                <h2>System Logs (Last 10 lines)</h2>
                <div class="logs">
                    To view full logs, check /logs/combined.log
                </div>
            </div>
        </body>
    </html>
    `;
    res.send(html);
});

app.listen(PORT, () => {
    logger.info(`Dashboard running at http://localhost:${PORT}`);
});
