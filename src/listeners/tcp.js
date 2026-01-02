const net = require('net');
const logger = require('../utils/logger');
const ASTMParser = require('../parsers/astm');
const HL7Parser = require('../parsers/hl7');
const { addToQueue } = require('../database/db');

const ENQ = Buffer.from([0x05]);
const ACK = Buffer.from([0x06]);
const NAK = Buffer.from([0x15]);

function startTcpServer(port, protocol = 'ASTM') {
    const server = net.createServer((socket) => {
        const clientName = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info(`New connection from ${clientName}`);

        const parser = protocol === 'HL7' ? new HL7Parser() : new ASTMParser();

        socket.on('data', (chunk) => {
            // Log raw comms
            logger.debug(`[${clientName}] IN: ${chunk.toString('hex')}`);

            // Low-level Protocol Handshakes
            if (chunk.includes(ENQ)) {
                // ASTM: Machine is asking to send. We must ACK.
                socket.write(ACK);
                logger.debug(`[${clientName}] OUT: ACK`);
                return;
            }

            // Ingest Data
            const results = parser.feed(chunk);
            if (results.length > 0) {
                logger.info(`Parsed ${results.length} results from ${clientName}`);

                // Add to SQlite Queue
                results.forEach(res => {
                    addToQueue({
                        ...res,
                        machine_name: `TCP-${port}` // Tag source
                    });
                });

                // ASTM: ACK the receipt of frames (simplified)
                // Real ASTM needs ACK after EVERY frame. 
                // Our generic parser is a bit detached. 
                // For robustness, if we see a frame end (LF), we usually ACK.
                if (protocol === 'ASTM' && chunk.includes(0x0A)) {
                    socket.write(ACK);
                }

                // HL7: Send MLLP ACK
                if (protocol === 'HL7') {
                    // Send simple AA (Application Accept)
                    // MSA|AA|MessageID
                    const ackMsg = `\x0BMSH|^~\\&|MW|LAB|INST|LAB|${new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14)}||ACK|1|P|2.3\rMSA|AA|1\r\x1C\x0D`;
                    socket.write(Buffer.from(ackMsg, 'binary'));
                }
            } else {
                // Even if no result (e.g. just one frame of many), we likely need to ACK ASTM
                if (protocol === 'ASTM' && chunk.includes(0x0A)) {
                    socket.write(ACK);
                    logger.debug(`[${clientName}] OUT: ACK (Frame)`);
                }
            }
        });

        socket.on('error', (err) => logger.error(`Socket error ${clientName}: ${err.message}`));
        socket.on('close', () => logger.info(`Connection closed ${clientName}`));
    });

    server.listen(port, () => {
        logger.info(`TCP Server listening on port ${port} [${protocol}]`);
    });

    return server;
}

module.exports = { startTcpServer };
