import type { Sample } from "../runner";
import {
  constants,
  InterpreterError,
  parseArduino,
  type ArduinoProgram,
  type Expr,
  type Statement,
} from "./parser";
export { InterpreterError, parseArduino, canInterpretArduino } from "./parser";
export type { ArduinoProgram } from "./parser";
export { applyInterpreterInputs } from "./inputs";

type Value = number | string;
type Variable = { value: number; constant: boolean };
type Scope = Map<string, Variable>;
type Effect = { delay: number } | { step: true };
type Options = {
  maxStepsPerAdvance?: number;
  maxTotalSteps?: number;
  maxWallTimeMs?: number;
};

/** Cooperative, virtual-time execution. advance never waits for a real delay. */
export class ArduinoInterpreter {
  time = 0;
  serial = "";
  inputs: Record<string, number> = {};
  readonly externalPins = new Set<number>();
  private modes = Array<number>(20).fill(0);
  private pins = Array<number>(20).fill(0);
  private pwm = Array<number>(20).fill(0);
  private digital = Array<number | undefined>(20).fill(undefined);
  private adc = Array<number>(6).fill(0);
  private frequency = Array<number>(20).fill(0);
  private toneUntil = Array<number>(20).fill(Infinity);
  private highTime = Array<number>(20).fill(0);
  private risingEdges = Array<number>(20).fill(0);
  private sampleTime = 0;
  private scopes: Scope[] = [new Map()];
  private execution: Generator<Effect, void, unknown>;
  private sleepingUntil = 0;
  private totalSteps = 0;
  private failed = false;
  private readonly options: Required<Options>;
  constructor(source: string | ArduinoProgram, options: Options = {}) {
    const program = typeof source === "string" ? parseArduino(source) : source;
    this.options = {
      maxStepsPerAdvance: 100000,
      maxTotalSteps: 10000000,
      maxWallTimeMs: 100,
      ...options,
    };
    this.execution = this.run(program);
  }
  input(pin: number, value: boolean) {
    this.digital[this.pin(pin)] = Number(value);
  }
  analog(channel: number, voltage: number) {
    if (
      Number.isInteger(channel) &&
      channel >= 0 &&
      channel < 6 &&
      Number.isFinite(voltage)
    )
      this.adc[channel] = Math.round(
        (Math.max(0, Math.min(5, voltage)) * 1023) / 5,
      );
  }
  private pin(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 19)
      throw new InterpreterError("runtime", "Invalid Uno pin");
    return value;
  }
  private number(value: Value) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new InterpreterError("runtime", "Expected a finite number");
    return Math.trunc(value);
  }
  private variable(name: string): Variable {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const value = this.scopes[i].get(name);
      if (value) return value;
    }
    throw new InterpreterError("runtime", `Unknown variable ${name}`);
  }
  private arithmetic(op: string, a: number, b: number): number {
    let result: number;
    switch (op) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      case "/":
      case "%":
        if (!b) throw new InterpreterError("runtime", "Division by zero");
        result = op === "/" ? Math.trunc(a / b) : a % b;
        break;
      case "==":
        return Number(a === b);
      case "!=":
        return Number(a !== b);
      case "<":
        return Number(a < b);
      case "<=":
        return Number(a <= b);
      case ">":
        return Number(a > b);
      case ">=":
        return Number(a >= b);
      default:
        throw new InterpreterError("unsupported", "Unsupported operator");
    }
    if (!Number.isFinite(result))
      throw new InterpreterError("runtime", "Numeric overflow");
    return result | 0;
  }
  private evaluate(expr: Expr): Value {
    switch (expr.type) {
      case "literal":
        return expr.value;
      case "variable":
        return Object.hasOwn(constants, expr.name)
          ? constants[expr.name]
          : this.variable(expr.name).value;
      case "unary": {
        const value = this.number(this.evaluate(expr.value));
        return expr.op === "!"
          ? Number(!value)
          : expr.op === "-"
            ? -value
            : value;
      }
      case "binary": {
        const a = this.number(this.evaluate(expr.left));
        if (expr.op === "&&")
          return a ? Number(!!this.number(this.evaluate(expr.right))) : 0;
        if (expr.op === "||")
          return a ? 1 : Number(!!this.number(this.evaluate(expr.right)));
        return this.arithmetic(
          expr.op,
          a,
          this.number(this.evaluate(expr.right)),
        );
      }
      case "conditional":
        return this.evaluate(
          this.number(this.evaluate(expr.condition)) ? expr.yes : expr.no,
        );
      case "assign": {
        const target = this.variable(expr.name);
        if (target.constant)
          throw new InterpreterError("runtime", "Cannot modify a constant");
        const right = this.number(this.evaluate(expr.value));
        target.value =
          expr.op === "="
            ? right
            : this.arithmetic(expr.op[0], target.value, right);
        return target.value;
      }
      case "call":
        return this.call(
          expr.name,
          expr.args.map((arg) => this.evaluate(arg)),
        );
    }
  }
  private call(name: string, args: Value[]): Value {
    if (name === "Serial.print" || name === "Serial.println") {
      this.serial = (
        this.serial +
        String(args[0] ?? "") +
        (name === "Serial.println" ? "\n" : "")
      ).slice(-16000);
      return 0;
    }
    const nums = args.map((arg) => this.number(arg));
    const [a, b, c] = nums;
    if (name === "Serial.begin") {
      if (a <= 0) throw new InterpreterError("runtime", "Invalid baud rate");
      return 0;
    }
    if (name === "delay")
      throw new InterpreterError("unsupported", "delay must be a statement");
    if (name === "analogRead") {
      const channel = a >= 14 ? a - 14 : a;
      if (channel < 0 || channel > 5)
        throw new InterpreterError("runtime", "Invalid analog channel");
      return this.adc[channel];
    }
    const pin = this.pin(a);
    switch (name) {
      case "pinMode":
        if (![0, 1, 2].includes(b))
          throw new InterpreterError("runtime", "Invalid pin mode");
        this.modes[pin] = b;
        break;
      case "digitalRead":
        return this.modes[pin] === 1
          ? this.pins[pin]
          : (this.digital[pin] ?? Number(this.modes[pin] === 2));
      case "digitalWrite":
        this.write(pin, b ? 255 : 0);
        break;
      case "analogWrite":
        this.write(pin, Math.max(0, Math.min(255, b)));
        this.modes[pin] = 1;
        break;
      case "tone":
        if (b <= 0 || (c !== undefined && c < 0))
          throw new InterpreterError("runtime", "Invalid tone");
        this.frequency[pin] = b;
        this.toneUntil[pin] = c ? this.time + c : Infinity;
        this.modes[pin] = 1;
        this.write(pin, 128, false);
        break;
      case "noTone":
        this.frequency[pin] = 0;
        this.write(pin, 0);
        break;
      default:
        throw new InterpreterError("unsupported", "Unknown call");
    }
    return 0;
  }
  private write(pin: number, pwm: number, countEdge = true) {
    const next = Number(pwm > 0);
    if (countEdge && !this.pins[pin] && next) this.risingEdges[pin]++;
    this.pins[pin] = next;
    this.pwm[pin] = pwm;
  }
  private *execute(stmt: Statement): Generator<Effect, void, unknown> {
    yield { step: true };
    switch (stmt.type) {
      case "block":
        this.scopes.push(new Map());
        try {
          for (const child of stmt.body) yield* this.execute(child);
        } finally {
          this.scopes.pop();
        }
        break;
      case "declare": {
        const scope = this.scopes[this.scopes.length - 1];
        if (scope.has(stmt.name))
          throw new InterpreterError("runtime", "Duplicate variable");
        scope.set(stmt.name, {
          value: this.number(this.evaluate(stmt.value)),
          constant: stmt.constant,
        });
        break;
      }
      case "expression":
        if (stmt.value.type === "call" && stmt.value.name === "delay") {
          const delay = this.number(this.evaluate(stmt.value.args[0]));
          if (delay < 0 || delay > 2147483647)
            throw new InterpreterError("runtime", "Invalid delay");
          yield { delay };
        } else this.evaluate(stmt.value);
        break;
      case "if":
        if (this.number(this.evaluate(stmt.condition)))
          yield* this.execute(stmt.yes);
        else if (stmt.no) yield* this.execute(stmt.no);
        break;
      case "while":
        while (this.number(this.evaluate(stmt.condition))) {
          yield { step: true };
          yield* this.execute(stmt.body);
        }
        break;
      case "for":
        this.scopes.push(new Map());
        try {
          if (stmt.init) yield* this.execute(stmt.init);
          while (
            !stmt.condition ||
            this.number(this.evaluate(stmt.condition))
          ) {
            yield { step: true };
            yield* this.execute(stmt.body);
            if (stmt.update) this.evaluate(stmt.update);
          }
        } finally {
          this.scopes.pop();
        }
        break;
    }
  }
  private *run(program: ArduinoProgram): Generator<Effect, void, unknown> {
    for (const global of program.globals) yield* this.execute(global);
    yield* this.execute(program.setup);
    while (true) {
      const before = this.time;
      yield* this.execute(program.loop);
      // Sketches polling inputs without delay remain responsive and cannot spin forever.
      if (before === this.time) yield { delay: 1 };
    }
  }
  private elapse(until: number) {
    const delta = until - this.time;
    for (let pin = 0; pin < 20; pin++) {
      if (this.modes[pin] === 1) {
        const activeDelta = Math.max(
          0,
          Math.min(until, this.toneUntil[pin]) - this.time,
        );
        this.highTime[pin] +=
          (Math.min(delta, activeDelta) * this.pwm[pin]) / 255;
      }
      if (until >= this.toneUntil[pin]) {
        this.frequency[pin] = 0;
        this.write(pin, 0);
        this.toneUntil[pin] = Infinity;
      }
    }
    this.time = until;
  }
  advance(ms: number) {
    if (this.failed)
      throw new InterpreterError("runtime", "Interpreter has stopped");
    if (!Number.isFinite(ms) || ms < 0 || ms > 30000)
      throw new InterpreterError("limit", "Invalid time slice");
    const until = this.time + ms,
      started = performance.now();
    let steps = 0;
    try {
      while (this.time < until) {
        if (this.sleepingUntil > this.time) {
          this.elapse(Math.min(until, this.sleepingUntil));
          if (this.time >= until) break;
        }
        if (
          ++steps > this.options.maxStepsPerAdvance ||
          ++this.totalSteps > this.options.maxTotalSteps ||
          (steps % 256 === 0 &&
            performance.now() - started > this.options.maxWallTimeMs)
        )
          throw new InterpreterError("limit", "Execution budget exceeded");
        const next = this.execution.next();
        if (next.done) {
          this.elapse(until);
          break;
        }
        if ("delay" in next.value)
          this.sleepingUntil = this.time + next.value.delay;
      }
    } catch (error) {
      this.failed = true;
      this.execution.return();
      throw error;
    }
  }
  sample(): Sample {
    const delta = this.time - this.sampleTime;
    const result: Sample = {
      time: this.time,
      pins: this.pins.map((v, pin) =>
        this.modes[pin] === 1
          ? v
          : (this.digital[pin] ?? Number(this.modes[pin] === 2)),
      ),
      pwm: delta ? this.highTime.map((v) => (v * 255) / delta) : [...this.pwm],
      frequency: this.frequency.map(
        (v, pin) => v || (delta ? (this.risingEdges[pin] * 1000) / delta : 0),
      ),
      inputs: { ...this.inputs },
    };
    this.sampleTime = this.time;
    this.highTime.fill(0);
    this.risingEdges.fill(0);
    return result;
  }
}
