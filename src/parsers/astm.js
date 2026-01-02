const logger = require('../utils/logger');
const { validateASTMFrame } = require('../utils/checksum');

const STX = '\x02';
const ETX = '\x03';
const EOT = '\x04';
const ENQ = '\x05';
const ACK = '\x06';
const NAK = '\x15';
const ETB = '\x17';
const LF = '\x0A';
const CR = '\x0D';

class ASTMParser {
    constructor() {
        this.buffer = '';
        this.records = []; // Accumulated records (H, P, O, R...)
    }

    /**
     * Ingests a chunk of data, extracts frames, validates them, and builds records.
     * Returns an array of parsed results if a transmission is complete (L record received).
     */
    feed(chunk) {
        this.buffer += chunk.toString('binary');
        const results = [];

        // Simple state machine or regex split?
        // ASTM frames end with <CR><LF>.
        let frameEnd;
        while ((frameEnd = this.buffer.indexOf(CR + LF)) !== -1) {
            const fullFrame = this.buffer.substring(0, frameEnd + 2); // Include CR LF
            this.buffer = this.buffer.substring(frameEnd + 2);

            // Sanity check
            if (!fullFrame.startsWith(STX)) {
                // Garbage or keep-alive? Just ignore for now unless it's EOT/ENQ/ACK/NAK handled by listener
                continue;
            }

            // Validate
            // Strip CR LF for validation? No, checksum usually stops before CR LF.
            // validateASTMFrame expects the frame part. 
            // My validateASTMFrame implementation expects <STX>...<ETX>CC<CR><LF> logic roughly.
            // Let's rely on the listener to handle the "Low Level" ACK/NAK. 
            // The parser just focuses on extracting data provided by the listener *after* it validated checksum (or do it here).

            // To separate concerns: Let's assume the Listener handles the "Physical Layer" (ACK/NAK/Checksum)
            // and passes "Cleaned" frame content to the Parser.
            // BUT, for this robust implementation, let's parse the raw frame here.

            if (validateASTMFrame(fullFrame)) {
                // Extract content: remove STX, Frame#, and Checksum/CRLF
                // Frame: <STX> F# Text <ETX> CS CS <CR> <LF>
                const etxIndex = Math.max(fullFrame.indexOf(ETX), fullFrame.indexOf(ETB));
                const text = fullFrame.substring(2, etxIndex); // Skip STX and Frame# (1 digit)

                this.parseRecord(text);

                // If Terminator record, flush results
                if (text.startsWith('L|')) {
                    const batch = this.flush();
                    results.push(...batch);
                }
            } else {
                logger.error('ASTM Checksum Failure: ' + fullFrame);
            }
        }

        return results;
    }

    parseRecord(line) {
        const fields = line.split('|');
        const type = fields[0];

        switch (type) {
            case 'H': // Header
                this.records = []; // New transmission
                break;
            case 'P': // Patient
            case 'O': // Order
            case 'R': // Result
            case 'C': // Comment
                this.records.push({ type, fields });
                break;
            case 'L': // Terminator
                // End of batch
                break;
        }
    }

    flush() {
        // Convert the accumulated H-P-O-R tree into standard objects
        const results = [];
        let currentPatient = null;
        let currentOrder = null;

        for (const rec of this.records) {
            if (rec.type === 'P') {
                currentPatient = {
                    id: rec.fields[2] || rec.fields[3], // PID
                    name: rec.fields[5],
                };
            } else if (rec.type === 'O') {
                currentOrder = {
                    id: rec.fields[2], // Order-ID (SID)
                    test: rec.fields[4], // Universal Test ID (e.g. ^^^HGB)
                };
            } else if (rec.type === 'R') {
                if (!currentOrder) continue;

                // R|1|^^^WBC|12.5|10^9/L|...
                // Field 2: Test ID (^^^WBC)
                // Field 3: Value
                // Field 4: Unit

                const testStr = rec.fields[2] || '';
                let testCode = testStr;

                if (testStr.includes('^')) {
                    const parts = testStr.split('^');
                    // Universal Service ID usually at index 3 (^^^Code)
                    if (parts.length >= 4 && parts[3]) {
                        testCode = parts[3];
                    } else if (parts[0]) {
                        // Fallback to first component if index 3 is empty
                        testCode = parts[0];
                    }
                }

                const value = rec.fields[3];
                const unit = rec.fields[4];
                const date = rec.fields[12]; // YYYYMMDDHHMMSS usually

                results.push({
                    sample_id: currentOrder.id,
                    test_code: testCode,
                    value: value,
                    unit: unit,
                    timestamp: this.parseASTMDate(date),
                    raw_payload: JSON.stringify(rec.fields)
                });
            }
        }

        this.records = [];
        return results;
    }

    parseASTMDate(str) {
        if (!str || str.length < 12) return new Date().toISOString();
        const y = str.substring(0, 4);
        const m = str.substring(4, 6);
        const d = str.substring(6, 8);
        const h = str.substring(8, 10);
        const min = str.substring(10, 12);
        const s = str.substring(12, 14) || '00';
        return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`).toISOString();
    }
}

module.exports = ASTMParser;
