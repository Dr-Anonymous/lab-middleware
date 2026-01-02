const logger = require('../utils/logger');

const VT = '\x0B';
const FS = '\x1C';
const CR = '\x0D';

class HL7Parser {
    constructor() {
        this.buffer = '';
    }

    feed(chunk) {
        this.buffer += chunk.toString('binary');
        const results = [];

        // MLLP Framing: <VT> Message <FS><CR>
        let start, end;
        while ((start = this.buffer.indexOf(VT)) !== -1 && (end = this.buffer.indexOf(FS + CR)) !== -1) {
            if (end < start) {
                // Formatting error, clear garbage up to start
                this.buffer = this.buffer.substring(start);
                continue;
            }

            const message = this.buffer.substring(start + 1, end);
            this.buffer = this.buffer.substring(end + 2);

            const parsed = this.parseMessage(message);
            results.push(...parsed);
        }
        return results;
    }

    parseMessage(msg) {
        const segments = msg.split(CR).filter(s => s.trim().length > 0);
        const results = [];

        let sampleId = 'UNKNOWN';

        for (const seg of segments) {
            const fields = seg.split('|');
            const type = fields[0];

            if (type === 'OBR') {
                // OBR|1|OrderNum|SampleID|...
                // Commonly Field 3 (Filler Order Number) is the Sample ID / Barcode on the tube
                sampleId = fields[3] || fields[2] || 'UNKNOWN';
            } else if (type === 'OBX') {
                // OBX|1|NM|TestID||Value|Unit|...
                // Field 3: Observation Identifier (Identifier^Text^System)
                // Field 5: Observation Value
                // Field 6: Units

                const testIdField = fields[3];
                const testCode = testIdField.includes('^') ? testIdField.split('^')[0] : testIdField;

                const value = fields[5];
                const unit = fields[6];

                // Only numeric or text results
                if (value) {
                    results.push({
                        sample_id: sampleId,
                        test_code: testCode,
                        value: value,
                        unit: unit,
                        timestamp: new Date().toISOString(),
                        raw_payload: JSON.stringify(fields)
                    });
                }
            }
        }
        return results;
    }
}

module.exports = HL7Parser;
