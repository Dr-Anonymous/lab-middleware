/**
 * Calculates the ASTM Checksum (LRC).
 * The checksum is the modulo 256 of the sum of all characters 
 * starting from the character after <STX> up to and including <ETX> or <ETB>.
 * But standard ASTM E1394 is typically sum of bytes modulo 256.
 * WAIT: standard ASTM (E1381) uses specific logic:
 * Sum of characters (including frame number, text, ETX/ETB) % 256.
 * Usually represented as 2 hex digits.
 */
function calculateASTMChecksum(frameBody) {
    let sum = 0;
    // Iterate over the buffer/string
    for (let i = 0; i < frameBody.length; i++) {
        sum = (sum + frameBody.charCodeAt(i)) & 0xFF;
    }
    return sum.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Validates an ASTM frame.
 * Frame format: <STX> [Frame#] [Text] <ETX|ETB> [C1] [C2] <CR> <LF>
 * @param {string} rawFrame - The complete raw frame including STX and LF
 */
function validateASTMFrame(rawFrame) {
    // 1. Basic length check
    if (rawFrame.length < 6) return false;

    // 2. Extract content for checksum: Everything after STX (index 0) up to (but including) ETX/ETB
    // STX is \x02. ETX is \x03, ETB is \x17.
    // The checksum chars are the two chars AFTER ETX/ETB.

    // Find end of text (ETX or ETB)
    const etxIndex = Math.max(rawFrame.indexOf('\x03'), rawFrame.indexOf('\x17'));
    if (etxIndex === -1) return false;

    const contentToSum = rawFrame.substring(1, etxIndex + 1); // From char after STX to ETX inclusive
    const providedChecksum = rawFrame.substring(etxIndex + 1, etxIndex + 3);

    const calculated = calculateASTMChecksum(contentToSum);

    return calculated === providedChecksum;
}

module.exports = {
    calculateASTMChecksum,
    validateASTMFrame
};
