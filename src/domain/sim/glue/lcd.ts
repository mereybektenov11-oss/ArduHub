/** Small HD44780 controller: DDRAM, address commands and 4/8 bit transfers. */
export class HD44780 {
  readonly memory = Array<number>(128).fill(32);
  address = 0;
  fourBit = false;
  private upper: number | null = null;
  private upperRS = false;
  write(value: number, data: boolean) {
    if (data) {
      this.memory[this.address] = value;
      this.address = (this.address + 1) & 127;
    } else if (value === 1) {
      this.memory.fill(32);
      this.address = 0;
    } else if (value === 2) this.address = 0;
    else if (value & 128) this.address = value & 127;
    else if (value & 32) this.fourBit = !(value & 16);
  }
  nibble(value: number, data: boolean) {
    if (!this.fourBit) {
      this.write(value << 4, data);
      return;
    }
    if (this.upper === null) {
      this.upper = value;
      this.upperRS = data;
    } else {
      this.write((this.upper << 4) | value, this.upperRS);
      this.upper = null;
    }
  }
  text(cols = 16, rows = 2) {
    return [0, 64, 20, 84]
      .slice(0, rows)
      .map((offset) =>
        this.memory
          .slice(offset, offset + cols)
          .map((v) => (v >= 32 && v < 127 ? String.fromCharCode(v) : "?"))
          .join(""),
      )
      .join("\n");
  }
}
