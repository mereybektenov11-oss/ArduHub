import type { partCategories } from "@arduhub/curriculum/parts.ru";
export type Category = keyof typeof partCategories;
export const aliases = {
  "arduino-uno": "uno",
  "rgb-led": "rgb",
  pushbutton: "button",
  "slide-switch": "switch",
  potentiometer: "pot",
  "photoresistor-sensor": "ldr",
  lcd1602: "lcd",
  "7segment": "segment",
  "hc-sr04": "ultrasonic",
  dht22: "dht",
} as const;
export const overrides: Record<
  string,
  {
    category: Category;
    simulated?: boolean;
    libraries?: string[];
    attrs?: Record<string, string | number>;
  }
> = {};
const categories: Record<Category, string[]> = {
  boards: [
    "arduino-uno",
    "arduino-nano",
    "arduino-mega",
    "esp32-devkit-v1",
    "franzininho",
    "nano-rp2040-connect",
  ],
  lights: [
    "led",
    "rgb-led",
    "led-bar-graph",
    "led-ring",
    "neopixel",
    "neopixel-matrix",
  ],
  switches: [
    "pushbutton",
    "pushbutton-6mm",
    "slide-switch",
    "dip-switch-8",
    "tilt-switch",
    "membrane-keypad",
    "ky-040",
    "rotary-dialer",
  ],
  sensors: [
    "resistor",
    "potentiometer",
    "slide-potentiometer",
    "photoresistor-sensor",
    "ntc-temperature-sensor",
    "pir-motion-sensor",
    "analog-joystick",
    "gas-sensor",
    "big-sound-sensor",
    "small-sound-sensor",
    "flame-sensor",
    "heart-beat-sensor",
    "hx711",
    "hc-sr04",
    "mpu6050",
    "dht22",
  ],
  displays: ["lcd1602", "lcd2004", "7segment", "ssd1306", "ili9341"],
  motors: ["servo", "stepper-motor", "biaxial-stepper"],
  sound: ["buzzer"],
  interfaces: [
    "ds1307",
    "microsd-card",
    "ir-receiver",
    "ir-remote",
    "ks2e-m-dc5",
  ],
  misc: [],
};
for (const [category, names] of Object.entries(categories))
  for (const name of names)
    overrides[name] = { category: category as Category };
for (const name of [
  "arduino-uno",
  "led",
  "rgb-led",
  "resistor",
  "pushbutton",
  "slide-switch",
  "potentiometer",
  "photoresistor-sensor",
  "buzzer",
])
  overrides[name].simulated = true;
overrides.led.attrs = { color: "red" };
overrides.resistor.attrs = { value: 220 };
for (const name of ["potentiometer", "photoresistor-sensor"])
  overrides[name].attrs = { value: 50 };
overrides["slide-switch"].attrs = { value: 0 };
for (const [name, libraries] of Object.entries({
  servo: ["Servo"],
  lcd1602: ["LiquidCrystal"],
  lcd2004: ["LiquidCrystal"],
  ssd1306: ["Adafruit SSD1306", "Adafruit GFX"],
  dht22: ["DHT sensor library", "Adafruit Unified Sensor"],
  neopixel: ["Adafruit NeoPixel"],
  "led-ring": ["Adafruit NeoPixel"],
  "neopixel-matrix": ["Adafruit NeoPixel"],
  "membrane-keypad": ["Keypad"],
  "stepper-motor": ["Stepper"],
}))
  overrides[name].libraries = libraries;
export const compilerLibraries = [
  "Servo",
  "LiquidCrystal",
  "Wire",
  "DHT sensor library",
  "Adafruit Unified Sensor",
  "Adafruit NeoPixel",
  "Adafruit SSD1306",
  "Adafruit GFX",
  "Keypad",
  "Stepper",
  "LedControl",
];
// Enabled after real HEX integration tests in learning-hardware.test.ts.
for (const name of [
  "7segment",
  "led-bar-graph",
  "dip-switch-8",
  "tilt-switch",
  "pir-motion-sensor",
  "ntc-temperature-sensor",
  "analog-joystick",
  "big-sound-sensor",
  "small-sound-sensor",
  "gas-sensor",
  "membrane-keypad",
  "ky-040",
  "servo",
  "hc-sr04",
  "stepper-motor",
  "lcd1602",
  "lcd2004",
  "ssd1306",
  "mpu6050",
  "ds1307",
  "dht22",
  "slide-potentiometer",
  "pushbutton-6mm",
])
  overrides[name].simulated = true;
