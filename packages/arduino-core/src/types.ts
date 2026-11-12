export type ComponentType = "arduino" | "led" | "resistor" | "button";
export type PinRef = { componentId: string; pin: string };
export type CircuitComponent = {
  id: string;
  type: ComponentType;
  pins: string[];
  x: number;
  y: number;
};
export type Netlist = {
  components: CircuitComponent[];
  links: { id: string; from: PinRef; to: PinRef }[];
};
export type ErrorCode =
  | "missing_resistor"
  | "led_reversed"
  | "power_ground_swap"
  | "wrong_pin"
  | "open_circuit"
  | "short_circuit"
  | "extra_component";
export type CheckError = {
  code: ErrorCode;
  message: string;
  hint1: string;
  hint2: string;
  answer: string;
  componentIds: string[];
  severity: "error" | "warning";
};
