const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "application/pdf": (bytes) =>
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-",
  "image/jpeg": (bytes) =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    ),
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP",
  "image/avif": (bytes) =>
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.subarray(8, 12))),
};

/** Content-Type is supplied by the uploader; verify the stored bytes as well. */
export async function hasAllowedFileSignature(
  stream: ReadableStream<Uint8Array>,
  contentType: string,
): Promise<boolean> {
  const verify = signatures[contentType];
  if (!verify) return false;

  const reader = stream.getReader();
  const prefix = new Uint8Array(12);
  let bytesRead = 0;
  try {
    while (bytesRead < prefix.length) {
      const { done, value } = await reader.read();
      if (done) break;
      const available = Math.min(value.byteLength, prefix.length - bytesRead);
      prefix.set(value.subarray(0, available), bytesRead);
      bytesRead += available;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  return verify(prefix.subarray(0, bytesRead));
}
