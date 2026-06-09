// Close reason helpers keep WebSocket handshake failure text within RFC byte limits.
import { Buffer } from "node:buffer";

/**
 * WebSocket close reason utilities.
 */
const CLOSE_REASON_MAX_BYTES = 120;

/** Truncates close reasons to the RFC-safe byte limit used during handshake failures. */
export function truncateCloseReason(reason: string, maxBytes = CLOSE_REASON_MAX_BYTES): string {
  if (!reason) {
    return "invalid handshake";
  }
  if (Buffer.byteLength(reason) <= maxBytes) {
    return reason;
  }
  // Truncate on a UTF-8 code-point boundary. Slicing the raw byte buffer can cut
  // a multi-byte character in half, which decodes to a U+FFFD replacement char
  // and inflates the re-encoded length (each U+FFFD is 3 bytes), risking the
  // RFC close-frame budget. Accumulate whole characters until the next one would
  // exceed the limit.
  let out = "";
  let sizeBytes = 0;
  for (const char of reason) {
    const charBytes = Buffer.byteLength(char);
    if (sizeBytes + charBytes > maxBytes) {
      break;
    }
    out += char;
    sizeBytes += charBytes;
  }
  return out;
}
