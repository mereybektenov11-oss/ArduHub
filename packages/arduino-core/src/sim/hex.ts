// Intel HEX parser, validates checksum, EOF, flash bounds and extended addresses.
export function loadHex(hex: string) {
  const bytes = new Uint8Array(32768);
  let base = 0,
    eof = false;
  for (const line of hex.trim().split(/\r?\n/)) {
    if (!/^:[\da-f]+$/i.test(line) || line.length % 2 !== 1)
      throw Error("Invalid HEX record");
    const record = Array.from({ length: (line.length - 1) / 2 }, (_, i) =>
      parseInt(line.slice(1 + i * 2, 3 + i * 2), 16),
    );
    const [length, hi, lo, type] = record;
    if (record.length !== length + 5 || record.reduce((a, b) => a + b, 0) % 256)
      throw Error("HEX checksum");
    if (eof) throw Error("Data after EOF");
    if (type === 0) {
      const address = base + (hi << 8) + lo;
      if (address + length > bytes.length) throw Error("HEX exceeds Uno flash");
      bytes.set(record.slice(4, 4 + length), address);
    } else if (type === 1) {
      if (length !== 0) throw Error("Invalid EOF");
      eof = true;
    } else if (type === 4 || type === 2) {
      if (length !== 2) throw Error("Invalid address");
      base = ((record[4] << 8) + record[5]) * (type === 4 ? 65536 : 16);
    } else if (type !== 3 && type !== 5) throw Error("Unknown HEX record");
  }
  if (!eof) throw Error("Missing HEX EOF");
  return new Uint16Array(bytes.buffer);
}
