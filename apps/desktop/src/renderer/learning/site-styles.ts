// Styles of the site's lesson components, in the same order as the site's
// cabinet layout (src/app/app/layout.tsx), followed by the app's night-theme
// overrides. Imported as strings (?inline) so the learning area can mount
// them in a <style> element and remove them on exit: the site's global rules
// must not leak into the app's own menu and settings screens.
import globals from "@/app/globals.css?inline";
import cabinet from "@/app/app/cabinet.css?inline";
import learning from "@/app/app/learning.css?inline";
import dashboard from "@/app/app/dashboard.css?inline";
import lessonFlow from "@/app/app/lesson-flow.css?inline";
import kidsPages from "@/app/app/kids-pages.css?inline";
import kidsMentor from "@/app/app/kids-mentor.css?inline";
import kidsWorkspace from "@/app/app/kids-workspace.css?inline";
import kidsHome from "@/app/app/kids-home.css?inline";
import eventFeedback from "@/app/app/event-feedback.css?inline";
import neon from "./learning.css?inline";
import onPrimary from "./neon-on-primary.generated.css?inline";

export const learningCss = [
  globals,
  cabinet,
  learning,
  dashboard,
  lessonFlow,
  kidsPages,
  kidsMentor,
  kidsWorkspace,
  kidsHome,
  eventFeedback,
  neon,
  onPrimary,
].join("\n");
