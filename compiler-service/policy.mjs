export const MAX_CODE = 16 * 1024;
export const allowedHeaders = new Set([
  "Arduino.h",
  "Servo.h",
  "LiquidCrystal.h",
  "Wire.h",
  "DHT.h",
  "Adafruit_Sensor.h",
  "Adafruit_NeoPixel.h",
  "Adafruit_SSD1306.h",
  "Adafruit_GFX.h",
  "Keypad.h",
  "Stepper.h",
  "LedControl.h",
  "math.h",
  "stdint.h",
  "stdbool.h",
  "string.h",
]);
export function validateCode(code) {
  if (typeof code !== "string" || !code.trim()) return "bad_request";
  if (Buffer.byteLength(code, "utf8") > MAX_CODE) return "code_too_large";
  // Do not allow computed includes, compiler extensions that load files, or inline asm.
  const source = code
    .replace(/\\\r?\n/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  if (
    /\b(?:asm|__asm|__asm__)\b|#\s*(?:include_next|embed|import)|_Pragma|#\s*pragma/.test(
      source,
    )
  )
    return "forbidden_header";
  for (const line of source.split(/\r?\n/)) {
    if (!/^\s*#\s*include\b/.test(line)) continue;
    const m = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]\s*$/);
    if (!m || !allowedHeaders.has(m[1])) return "forbidden_header";
  }
  return null;
}
export function parseDiagnostics(output) {
  return [
    ...output.matchAll(
      /(?:[^\n]*?\.ino):(\d+):(\d+):\s*(?:fatal )?(?:error|warning):\s*([^\n]+)/g,
    ),
  ]
    .slice(0, 30)
    .map((m) => ({
      line: Number(m[1]),
      col: Number(m[2]),
      message: m[3].trim(),
    }));
}
