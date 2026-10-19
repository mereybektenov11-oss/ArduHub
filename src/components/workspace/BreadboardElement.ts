import { breadboardPins } from "@/domain/parts/breadboard";
// Project-owned visual; @wokwi/elements 1.9.2 does not include a breadboard.
if (!customElements.get("arduhub-breadboard")) {
  customElements.define(
    "arduhub-breadboard",
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" }).innerHTML =
          `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220"><rect x="1" y="1" width="418" height="218" rx="12" fill="#f6f3ea" stroke="#718076"/><path d="M20 36H398M20 174H398" stroke="#287aab"/><path d="M20 2H398M20 211H398" stroke="#b83f35"/><rect x="15" y="101" width="390" height="10" rx="4" fill="#dedbd1"/>${breadboardPins.map((pin) => `<circle cx="${pin.x}" cy="${pin.y}" r="2.3" fill="#536259"/>`).join("")}</svg>`;
      }
    },
  );
}
