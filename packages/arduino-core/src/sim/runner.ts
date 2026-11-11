import {
  CPU,
  avrInstruction,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  AVRADC,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
  adcConfig,
  PinState,
  AVRTWI,
  twiConfig,
} from "avr8js";
import { loadHex } from "@arduhub/arduino-core/sim/hex";
export type Sample = {
  time: number;
  pins: number[];
  pwm: number[];
  frequency?: number[];
  inputs: Record<string, number>;
  pulseWidths?: number[];
  devices?: Record<string, number | number[] | string>;
};
export type Trace = { samples: Sample[]; serial: string };
export class UnoRunner {
  readonly cpu: CPU;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly adc: AVRADC;
  readonly usart: AVRUSART;
  readonly twi: AVRTWI;
  readonly externalPins = new Set<number>();
  onPinChange: ((pin: number, value: number, cycles: number) => void)[] = [];
  devices: Record<string, number | number[] | string> = {};
  private pulseStart = Array(20).fill(0);
  private pulseWidths = Array(20).fill(0);
  serial = "";
  inputs: Record<string, number> = {};
  private highCycles = Array(20).fill(0);
  private risingEdges = Array(20).fill(0);
  private lastCycle = 0;
  private lastPins = Array(20).fill(0);
  private sampleCycle = 0;
  constructor(hex: string) {
    this.cpu = new CPU(loadHex(hex));
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.twi = new AVRTWI(this.cpu, twiConfig, 16e6);
    this.adc.channelValues.fill(0);
    this.usart = new AVRUSART(this.cpu, usart0Config, 16e6);
    this.usart.onByteTransmit = (v) => {
      this.serial = (this.serial + String.fromCharCode(v)).slice(-16000);
    };
    for (const port of [this.portB, this.portC, this.portD])
      port.addListener(() => this.accumulate());
  }
  get time() {
    return this.cpu.cycles / 16000;
  }
  private getPin(pin: number) {
    const [port, bit] =
      pin < 8
        ? [this.portD, pin]
        : pin < 14
          ? [this.portB, pin - 8]
          : [this.portC, pin - 14];
    const state = port.pinState(bit);
    return state === PinState.High ? 1 : state === PinState.Low ? 0 : -1;
  }
  private accumulate() {
    const delta = this.cpu.cycles - this.lastCycle;
    this.lastCycle = this.cpu.cycles;
    const events: [number, number][] = [];
    for (let i = 0; i < 20; i++) {
      if (this.lastPins[i] === 1) this.highCycles[i] += delta;
      const next = this.getPin(i);
      if (this.lastPins[i] !== next) {
        if (next === 1) this.pulseStart[i] = this.cpu.cycles;
        if (next === 0 && this.lastPins[i] === 1)
          this.pulseWidths[i] = (this.cpu.cycles - this.pulseStart[i]) / 16;
        const previous = this.lastPins[i];
        this.lastPins[i] = next;
        if (previous === 0 && next === 1) this.risingEdges[i]++;
        events.push([i, next]);
      }
      this.lastPins[i] = next;
    }
    for (const [pin, value] of events)
      for (const listener of this.onPinChange)
        listener(pin, value, this.cpu.cycles);
  }
  input(pin: number, value: boolean) {
    const [port, bit] =
      pin < 8
        ? [this.portD, pin]
        : pin < 14
          ? [this.portB, pin - 8]
          : [this.portC, pin - 14];
    port.setPin(bit, value);
  }
  analog(channel: number, voltage: number) {
    if (channel >= 0 && channel < 6)
      this.adc.channelValues[channel] = Math.max(0, Math.min(5, voltage));
  }
  advance(ms: number) {
    const until = this.cpu.cycles + Math.round(ms * 16000);
    while (this.cpu.cycles < until) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }
  }
  sample(): Sample {
    this.accumulate();
    const delta = this.cpu.cycles - this.sampleCycle;
    const result = {
      time: this.time,
      pins: [...this.lastPins],
      pwm: this.highCycles.map((c) => (delta ? (c / delta) * 255 : 0)),
      frequency: this.risingEdges.map((edges) =>
        delta ? (edges * 16e6) / delta : 0,
      ),
      inputs: { ...this.inputs },
      pulseWidths: [...this.pulseWidths],
      devices: structuredClone(this.devices),
    };
    this.highCycles.fill(0);
    this.risingEdges.fill(0);
    this.sampleCycle = this.cpu.cycles;
    return result;
  }
}
