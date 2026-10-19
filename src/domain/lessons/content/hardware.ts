import { emptyScene, makePart } from "@/domain/scene/scene";
import type { PartType } from "@/domain/parts/catalog";
export function hardwareScene(type: PartType, i2c = false) {
  const scene = emptyScene();
  scene.components = [
    makePart("uno", "uno", 40, 140),
    makePart(type, "device", 400, 100),
  ];
  const wire = (a: string, b: string) => {
    const parse = (s: string) => {
      const [componentId, pin] = s.split(":");
      return { componentId, pin };
    };
    scene.wires.push({
      id: `w${scene.wires.length}`,
      from: parse(a),
      to: parse(b),
      color: "#287aab",
      bends: [],
    });
  };
  const power = (vcc = "VCC", gnd = "GND") => {
    wire(`device:${vcc}`, "uno:5V");
    wire(`device:${gnd}`, "uno:GND.2");
  };
  if (type === "segment") {
    wire("device:COM.1", "uno:GND.2");
    ["A", "B", "C", "D", "E", "F", "G", "DP"].forEach((pin, i) =>
      wire(`device:${pin}`, `uno:${i + 2}`),
    );
  } else if (type === "led-bar-graph")
    for (let i = 1; i <= 10; i++) {
      wire(`device:A${i}`, `uno:${i + 1}`);
      wire(`device:C${i}`, "uno:GND.2");
    }
  else if (type === "servo") {
    power("V+");
    wire("device:PWM", "uno:9");
  } else if (type === "ultrasonic") {
    power();
    wire("device:TRIG", "uno:8");
    wire("device:ECHO", "uno:7");
  } else if (type === "stepper-motor")
    ["A+", "A-", "B+", "B-"].forEach((pin, i) =>
      wire(`device:${pin}`, `uno:${i + 2}`),
    );
  else if (type === "lcd" || type === "lcd2004") {
    if (i2c) {
      scene.components[1].attrs.pins = "i2c";
      power();
      wire("device:SDA", "uno:A4");
      wire("device:SCL", "uno:A5");
      return scene;
    }
    power("VDD", "VSS");
    wire("device:RW", "uno:GND.2");
    ["RS", "E", "D4", "D5", "D6", "D7"].forEach((pin, i) =>
      wire(`device:${pin}`, `uno:${[12, 11, 5, 4, 3, 2][i]}`),
    );
  } else if (type === "ssd1306") {
    power("VIN");
    wire("device:DATA", "uno:A4");
    wire("device:CLK", "uno:A5");
  } else if (type === "mpu6050" || type === "ds1307") {
    power(type === "ds1307" ? "5V" : "VCC");
    wire("device:SDA", "uno:A4");
    wire("device:SCL", "uno:A5");
  } else if (type === "dht") {
    power();
    wire("device:SDA", "uno:2");
  } else if (type === "membrane-keypad") {
    for (let i = 1; i <= 4; i++) {
      wire(`device:R${i}`, `uno:${i + 1}`);
      wire(`device:C${i}`, `uno:${i + 5}`);
    }
  } else if (type === "dip-switch-8") {
    for (let i = 1; i <= 8; i++) {
      wire(`device:${i}a`, `uno:${i + 1}`);
      wire(`device:${i}b`, "uno:GND.2");
    }
  } else if (type === "ky-040") {
    power();
    wire("device:CLK", "uno:2");
    wire("device:DT", "uno:3");
    wire("device:SW", "uno:4");
  } else if (["pir-motion-sensor", "tilt-switch"].includes(type)) {
    power();
    wire("device:OUT", "uno:2");
  } else if (type === "analog-joystick") {
    power();
    wire("device:HORZ", "uno:A0");
    wire("device:VERT", "uno:A1");
    wire("device:SEL", "uno:2");
  } else if (
    [
      "ntc-temperature-sensor",
      "big-sound-sensor",
      "small-sound-sensor",
      "gas-sensor",
      "slide-potentiometer",
    ].includes(type)
  ) {
    power();
    wire(
      `device:${type === "ntc-temperature-sensor" ? "OUT" : type === "slide-potentiometer" ? "SIG" : "AOUT"}`,
      "uno:A0",
    );
  }
  return scene;
}
