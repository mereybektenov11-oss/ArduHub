import { learningLessons, exampleScene } from "@arduhub/arduino-core/lessons/content";
import { hardwareScene } from "@arduhub/arduino-core/lessons/content/hardware";
import sketches from "@arduhub/curriculum/sketches.json" with { type: "json" };
import hardware from "@arduhub/curriculum/hardware-examples.json" with { type: "json" };
import { catalog } from "@arduhub/arduino-core/parts/catalog";
import { makePart } from "@arduhub/arduino-core/scene/scene";
import { ideaCopy } from "@/content/projects.ru";
const night = exampleScene("pwm");
night.components = night.components.map((p) =>
  p.type === "pot" ? { ...makePart("ldr", p.id, p.x, p.y) } : p,
);
night.wires = night.wires.map((w) => ({
  ...w,
  from:
    w.from.componentId === "pot" && w.from.pin === "SIG"
      ? { ...w.from, pin: "AO" }
      : w.from,
}));
const alarm = exampleScene("buzzer");
alarm.components.push(makePart("pir-motion-sensor", "pir", 420, 300));
for (const [pin, target] of [
  ["VCC", "5V"],
  ["GND", "GND.2"],
  ["OUT", "2"],
])
  alarm.wires.push({
    id: `w${alarm.wires.length}`,
    from: { componentId: "pir", pin },
    to: { componentId: "uno", pin: target },
    color: "#287aab",
    bends: [],
  });
export const projectIdeas = [
  {
    id: "traffic",
    scene: learningLessons[3].circuit.referenceScene,
    code: learningLessons[3].code.solution,
  },
  { id: "night", scene: night, code: sketches[2].code },
  {
    id: "alarm",
    scene: alarm,
    code: "void setup(){pinMode(2,INPUT);}\nvoid loop(){if(digitalRead(2))tone(8,1000);else noTone(8);}",
  },
  {
    id: "metronome",
    scene: exampleScene("buzzer"),
    code: "void setup(){}\nvoid loop(){tone(8,1000,80);delay(500);}",
  },
  {
    id: "fade",
    scene: learningLessons[4].circuit.referenceScene,
    code: "void setup(){pinMode(9,OUTPUT);}\nvoid loop(){for(int v=0;v<256;v++){analogWrite(9,v);delay(5);}for(int v=255;v>=0;v--){analogWrite(9,v);delay(5);}}",
  },
  { id: "reaction", scene: exampleScene("button"), code: sketches[1].code },
  {
    id: "radar",
    scene: hardwareScene("ultrasonic"),
    code: hardware.find((s) => s.id === "ultrasonic")!.code,
  },
  {
    id: "thermometer",
    scene: hardwareScene("dht"),
    code: hardware.find((s) => s.id === "dht")!.code,
  },
].map((idea, i) => ({
  ...idea,
  ...ideaCopy[i],
  required: [...new Set(idea.scene.components.map((p) => p.type))],
}));
export const ideaSupport = (idea: (typeof projectIdeas)[number]) => {
  const count = idea.required.filter((type) => catalog[type].simulated).length;
  return count === idea.required.length
    ? "working"
    : count > 1
      ? "partial"
      : "soon";
};
