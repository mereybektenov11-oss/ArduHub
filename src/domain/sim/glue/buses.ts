import type { UnoRunner } from "../runner";
import type { SceneDoc } from "@/domain/scene/scene";
import { findBoardPin } from "@/domain/scene/netlist";
import { HD44780 } from "./lcd";
type Slave = {
  start(write: boolean): void;
  write(value: number): void;
  read(): number;
};
export function attachBuses(
  runner: UnoRunner,
  scene: SceneDoc,
  states: () => Record<string, number>,
) {
  const boardPin = (id: string, pin: string) => {
    const name = findBoardPin(scene, { componentId: id, pin });
    return name && /^\d+$/.test(name) ? Number(name) : -1;
  };
  const at = (id: string, pin: string, target: string) =>
    findBoardPin(scene, { componentId: id, pin }) === target;
  const slaves = new Map<number, Slave>();
  for (const part of scene.components) {
    const id = part.id;
    if (
      ["lcd", "lcd2004"].includes(part.type) &&
      part.attrs.pins === "i2c" &&
      at(id, "VCC", "5V") &&
      at(id, "GND", "GND.2") &&
      at(id, "SDA", "A4") &&
      at(id, "SCL", "A5")
    ) {
      const lcd = new HD44780();
      let previous = 0;
      slaves.set(0x27, {
        start() {},
        read() {
          return 255;
        },
        write(value) {
          if (previous & 4 && !(value & 4)) {
            lcd.nibble(value >> 4, !!(value & 1));
            runner.devices[id] = lcd.text(
              part.type === "lcd" ? 16 : 20,
              part.type === "lcd" ? 2 : 4,
            );
          }
          previous = value;
        },
      });
    }
    if (
      ["lcd", "lcd2004"].includes(part.type) &&
      at(id, "VDD", "5V") &&
      at(id, "VSS", "GND.2")
    ) {
      const lcd = new HD44780(),
        enable = boardPin(id, "E"),
        rs = boardPin(id, "RS");
      const pins = Array.from({ length: 8 }, (_, i) => boardPin(id, `D${i}`));
      const values = Array(20).fill(0);
      runner.onPinChange.push((pin, value) => {
        const old = values[pin];
        values[pin] = value;
        if (pin !== enable || old !== 1 || value !== 0) return;
        if (lcd.fourBit || pins.slice(0, 4).some((p) => p < 0))
          lcd.nibble(
            pins
              .slice(4)
              .reduce((v, p, i) => v | ((values[p] === 1 ? 1 : 0) << i), 0),
            values[rs] === 1,
          );
        else
          lcd.write(
            pins.reduce((v, p, i) => v | ((values[p] === 1 ? 1 : 0) << i), 0),
            values[rs] === 1,
          );
        runner.devices[id] = lcd.text(
          part.type === "lcd" ? 16 : 20,
          part.type === "lcd" ? 2 : 4,
        );
      });
    }
    if (part.type === "dht" && at(id, "VCC", "5V") && at(id, "GND", "GND.2")) {
      const pin = boardPin(id, "SDA");
      if (pin < 0) continue;
      runner.externalPins.add(pin);
      runner.input(pin, true);
      let low = -1,
        busy = false;
      runner.onPinChange.push((changed, value, cycle) => {
        if (changed !== pin || busy) return;
        if (value === 0) low = cycle;
        else if (low >= 0 && cycle - low > 800 * 16) {
          low = -1;
          busy = true;
          const humidity = Math.round(
            Math.max(0, Math.min(100, states()[`${id}.humidity`] ?? 50)) * 10,
          );
          const temperature = states()[id] ?? 25,
            temp = Math.round(Math.abs(temperature) * 10);
          const bytes = [
            humidity >> 8,
            humidity & 255,
            (temp >> 8) | (temperature < 0 ? 128 : 0),
            temp & 255,
          ];
          bytes.push(bytes.reduce((a, b) => a + b, 0) & 255);
          let us = 40;
          const edge = (high: boolean, duration: number) => {
            const when = us;
            runner.cpu.addClockEvent(() => runner.input(pin, high), when * 16);
            us += duration;
          };
          edge(false, 80);
          edge(true, 80);
          for (const byte of bytes)
            for (let bit = 7; bit >= 0; bit--) {
              edge(false, 50);
              edge(true, byte & (1 << bit) ? 70 : 26);
            }
          edge(false, 50);
          edge(true, 0);
          runner.cpu.addClockEvent(
            () => {
              busy = false;
            },
            (us + 1000) * 16,
          );
        }
      });
    }
    const sda = part.type === "ssd1306" ? "DATA" : "SDA",
      scl = part.type === "ssd1306" ? "CLK" : "SCL";
    if (!at(id, sda, "A4") || !at(id, scl, "A5")) continue;
    if (
      part.type === "mpu6050" &&
      at(id, "VCC", "5V") &&
      at(id, "GND", "GND.2")
    ) {
      let address = 0,
        first = true;
      slaves.set(0x68, {
        start(write) {
          first = write;
        },
        write(value) {
          if (first) {
            address = value;
            first = false;
          } else address = (address + 1) & 127;
        },
        read() {
          const registers = new Uint8Array(128);
          registers[0x75] = 0x68;
          for (const [i, axis] of ["x", "y", "z"].entries()) {
            const value = Math.round(states()[`${id}.${axis}`] ?? 0);
            registers[0x3b + i * 2] = value >> 8;
            registers[0x3c + i * 2] = value & 255;
          }
          return registers[address++ & 127];
        },
      });
    }
    if (
      part.type === "ds1307" &&
      at(id, "5V", "5V") &&
      at(id, "GND", "GND.2")
    ) {
      let address = 0,
        first = true;
      const memory = new Uint8Array(64);
      memory.set([0, 0, 12, 1, 1, 1, 26]);
      const start = runner.time;
      slaves.set(0x68, {
        start(write) {
          first = write;
        },
        write(value) {
          if (first) {
            address = value & 63;
            first = false;
          } else memory[address++ & 63] = value;
        },
        read() {
          const seconds = Math.floor((runner.time - start) / 1000);
          if (address === 0) {
            const sec = seconds % 60;
            memory[0] = (Math.floor(sec / 10) << 4) | (sec % 10);
          }
          return memory[address++ & 63];
        },
      });
    }
    if (
      part.type === "ssd1306" &&
      (at(id, "VIN", "5V") || at(id, "3V3", "5V")) &&
      at(id, "GND", "GND.2")
    ) {
      let control = -1,
        page = 0,
        column = 0,
        pending = 0,
        command = 0,
        columnStart = 0,
        columnEnd = 127,
        pageStart = 0,
        pageEnd = 7;
      const pixels = Array<number>(1024).fill(0);
      slaves.set(0x3c, {
        start() {
          control = -1;
        },
        read() {
          return 0;
        },
        write(value) {
          if (control < 0) {
            control = value;
            return;
          }
          if (control & 64) {
            pixels[page * 128 + column] = value;
            column++;
            if (column > columnEnd) {
              column = columnStart;
              page = page >= pageEnd ? pageStart : page + 1;
            }
            runner.devices[id] = pixels;
          } else if (pending) {
            if (command === 0x21) {
              if (pending === 2) column = columnStart = value & 127;
              else columnEnd = value & 127;
            }
            if (command === 0x22) {
              if (pending === 2) page = pageStart = value & 7;
              else pageEnd = value & 7;
            }
            pending--;
          } else if (value === 0x21 || value === 0x22) {
            command = value;
            pending = 2;
          } else if (
            [0x20, 0x81, 0xa8, 0xd3, 0xd5, 0xd9, 0xda, 0xdb, 0x8d].includes(
              value,
            )
          ) {
            command = value;
            pending = 1;
          } else if ((value & 0xf8) === 0xb0) page = value & 7;
          else if ((value & 0xf0) === 0)
            column = (column & 0xf0) | (value & 15);
          else if ((value & 0xf0) === 0x10)
            column = (column & 15) | ((value & 15) << 4);
        },
      });
    }
  }
  let selected: Slave | undefined;
  const twi = runner.twi;
  twi.eventHandler = {
    start() {
      twi.completeStart();
    },
    stop() {
      selected = undefined;
      twi.completeStop();
    },
    connectToSlave(address, write) {
      selected = slaves.get(address);
      selected?.start(write);
      twi.completeConnect(!!selected);
    },
    writeByte(value) {
      selected?.write(value);
      twi.completeWrite(!!selected);
    },
    readByte() {
      twi.completeRead(selected?.read() ?? 255);
    },
  };
}
