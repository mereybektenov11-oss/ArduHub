import { describe, expect, it } from "vitest";
import {
  ArduinoInterpreter,
  applyInterpreterInputs,
  canInterpretArduino,
  InterpreterError,
} from "@/domain/sim/interpreter";
import {
  courseCodes,
  exampleScene,
  learningLessons,
} from "@/domain/lessons/content";
import { outputLevels } from "@/domain/sim/glue/outputs";
import { checkBehavior } from "@/domain/sim/checks";
import { initialInputs } from "@/domain/sim/inputState";
import type { Sample } from "@/domain/sim/runner";

describe("bounded Arduino interpreter", () => {
  it("runs all actual first eight lesson sketches", () => {
    for (const code of courseCodes.slice(0, 8)) {
      expect(canInterpretArduino(code)).toBe(true);
      const runner = new ArduinoInterpreter(code);
      runner.advance(20);
      expect(runner.time).toBe(20);
    }
  });
  it("passes real first-eight lesson behavior checks with reference circuits", () => {
    for (const lesson of learningLessons.slice(0, 8)) {
      const runner = new ArduinoInterpreter(lesson.code.solution);
      const states = initialInputs(lesson.circuit.referenceScene);
      const samples: Sample[] = [];
      while (runner.time < lesson.run.durationMs) {
        if (lesson.run.autoButton)
          states[lesson.run.autoButton] = Number(
            runner.time >= 1000 && runner.time < 2000,
          );
        applyInterpreterInputs(runner, lesson.circuit.referenceScene, states);
        runner.advance(20);
        samples.push(runner.sample());
      }
      const checks = checkBehavior(lesson.run.checks, {
        samples,
        serial: runner.serial,
      });
      expect(
        checks.every((check) => check.pass),
        lesson.id,
      ).toBe(true);
    }
  });
  it("runs delay(500) with a 1000ms LED period in virtual time", () => {
    const r = new ArduinoInterpreter(
      "void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);delay(500);digitalWrite(13,LOW);delay(500);}",
    );
    const transitions: number[] = [];
    let previous = -1;
    for (let t = 0; t < 2200; t += 20) {
      r.advance(20);
      const value = r.sample().pins[13];
      if (value !== previous) transitions.push(r.time);
      previous = value;
    }
    expect(transitions[2] - transitions[0]).toBeGreaterThanOrEqual(900);
    expect(transitions[2] - transitions[0]).toBeLessThanOrEqual(1100);
    expect(transitions.length).toBeGreaterThanOrEqual(5);
  });
  it("reads changing digital and analog inputs and writes serial and PWM", () => {
    const r = new ArduinoInterpreter(
      'const int led=9; void setup(){pinMode(led,OUTPUT);pinMode(13,OUTPUT);Serial.begin(9600);} void loop(){int v=analogRead(A0)/4;analogWrite(led,v);Serial.print("v=");Serial.println(v);digitalWrite(13,digitalRead(2)==LOW?HIGH:LOW);delay(10);}',
    );
    r.analog(0, 2.5);
    r.input(2, false);
    r.advance(5);
    expect(r.serial).toBe("v=128\n");
    expect(r.sample().pwm[9]).toBe(128);
    expect(r.sample().pins[13]).toBe(1);
    r.input(2, true);
    r.analog(0, 5);
    r.advance(20);
    expect(r.serial).toContain("v=255\n");
    expect(r.sample().pins[13]).toBe(0);
  });
  it("handles arithmetic, scopes, for/while, if/else and integer division", () => {
    const r = new ArduinoInterpreter(
      "void setup(){int total=0;for(int i=0;i<4;i++){total+=i;}while(total<8){total++;}if(total==8 && 7/2==3){Serial.println(total);}else{Serial.println(0);}}void loop(){}",
    );
    r.advance(5);
    expect(r.serial).toBe("8\n");
  });
  it("never starts unsupported programs, even unreachable includes/calls", () => {
    for (const code of [
      "#include <Servo.h>\nvoid setup(){}void loop(){}",
      "void setup(){}void loop(){if(0){mystery();}}",
      "void setup(){delay(1,2);}void loop(){}",
    ])
      expect(canInterpretArduino(code)).toBe(false);
  });
  it("rejects malformed code and browser access", () => {
    for (const code of [
      "void setup(){digitalWrite(13,HIGH)}void loop(){}",
      "void setup(){window.alert(1);}void loop(){}",
      "void setup(){}",
      'void setup(){int x="unterminated;}void loop(){}',
    ])
      expect(() => new ArduinoInterpreter(code)).toThrow(InterpreterError);
  });
  it("bounds infinite loops without hanging and caps deeply nested source", () => {
    const r = new ArduinoInterpreter("void setup(){while(1){}}void loop(){}", {
      maxStepsPerAdvance: 500,
    });
    expect(() => r.advance(20)).toThrow(InterpreterError);
    expect(
      canInterpretArduino(
        "void setup(){" +
          "(".repeat(300) +
          "1" +
          ")".repeat(300) +
          ";}void loop(){}",
      ),
    ).toBe(false);
  });
  it("does not block on a long delay or exhaust its budget for a normal empty loop", () => {
    const r = new ArduinoInterpreter(
      "void setup(){delay(1000000);digitalWrite(13,HIGH);}void loop(){}",
    );
    r.advance(30000);
    expect(r.time).toBe(30000);
    expect(r.sample().pins[13]).not.toBe(1);
    const empty = new ArduinoInterpreter("void setup(){}void loop(){}");
    empty.advance(30000);
    expect(empty.time).toBe(30000);
  });
  it("exposes buzzer tone frequency and duration", () => {
    const r = new ArduinoInterpreter(
      "void setup(){tone(8,1000,80);}void loop(){}",
    );
    r.advance(20);
    expect(r.sample().frequency?.[8]).toBe(1000);
    r.advance(100);
    expect(r.sample().frequency?.[8]).toBe(0);
    const singleSlice = new ArduinoInterpreter(
      "void setup(){tone(8,1000,80);}void loop(){delay(1000);}",
    );
    singleSlice.advance(120);
    const sample = singleSlice.sample();
    expect(sample.frequency?.[8]).toBe(0);
    expect(sample.pwm[8]).toBeCloseTo((128 * 80) / 120);
  });
  it("uses the same scene wiring for a pressed button and powered potentiometer", () => {
    const button = new ArduinoInterpreter(courseCodes[2]);
    const buttonScene = exampleScene("button");
    applyInterpreterInputs(button, buttonScene, { btn: 0 });
    button.advance(20);
    expect(outputLevels(buttonScene, button.sample(), { btn: 0 }).led).toBe(0);
    applyInterpreterInputs(button, buttonScene, { btn: 1 });
    button.advance(20);
    expect(outputLevels(buttonScene, button.sample(), { btn: 1 }).led).toBe(1);
    const pot = new ArduinoInterpreter(courseCodes[5]);
    const potScene = exampleScene("pwm");
    applyInterpreterInputs(pot, potScene, { pot: 50 });
    pot.advance(20);
    expect(pot.sample().pwm[9]).toBe(128);
    expect(pot.serial).toContain("128");
  });
  it("rejects unsupported nested delay, unknown names and constant writes before execution", () => {
    for (const code of [
      'void setup(){Serial.println("must not run");}void loop(){int x=delay(10);}',
      "void setup(){}void loop(){if(0){constructor();}}",
      'void setup(){Serial.println("must not run");int x=1 constructor 2;}void loop(){}',
      "void setup(){}void loop(){digitalWrite(13,missing);}",
      "const int pin=13;void setup(){pin=2;}void loop(){}",
      "void setup(){int x=1" + "+1".repeat(500) + ";}void loop(){}",
    ])
      expect(canInterpretArduino(code)).toBe(false);
  });
  it("caps serial buffers and total operations across advance calls", () => {
    const serial = new ArduinoInterpreter(
      'void setup(){}void loop(){Serial.println("abcdefghijklmnopqrstuvwxyz");}',
    );
    serial.advance(1000);
    expect(serial.serial.length).toBe(16000);
    const bounded = new ArduinoInterpreter("void setup(){}void loop(){}", {
      maxTotalSteps: 20,
    });
    expect(() => {
      for (let i = 0; i < 100; i++) bounded.advance(1);
    }).toThrow(InterpreterError);
  });
});
