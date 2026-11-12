import { createSimulationController } from "@arduhub/arduino-core/sim/controller";
const controller = createSimulationController((message) =>
  self.postMessage(message),
);
self.onmessage = controller.onmessage;
