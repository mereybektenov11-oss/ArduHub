import Icon from "@/components/icons/Icon";
import {
  iconNames,
  type IconName,
  type IconState,
} from "@/components/icons/iconTypes";
import { iconsRu as c } from "@/content/icons.ru";
import CabinetArt from "@/components/cabinet/CabinetArt";
import { mentorDeck } from "@/content/cabinet.ru";
export const metadata = {
  title: c.title,
  robots: { index: false, follow: false },
};
const topics: IconName[] = [
  "led",
  "button",
  "sensor",
  "motor",
  "display",
  "rocket",
];
function states(name: IconName): IconState[] {
  if (name === "streak")
    return [
      "none",
      "active",
      "pending",
      "frozen",
      "milestone",
      "ignite",
      "extinguish",
    ];
  if (topics.includes(name)) return ["done", "current", "locked"];
  if (["book", "xp", "target", "saved"].includes(name)) return ["idle", "done"];
  if (["tokens", "sparks", "level"].includes(name))
    return ["idle", "gain", "spend"];
  return ["idle"];
}
export default function IconsPage() {
  return (
    <main className="icon-gallery">
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <div className="icon-gallery-grid">
        {iconNames.flatMap((name) =>
          states(name).map((state) => (
            <figure key={`${name}-${state}`}>
              <Icon
                name={name}
                state={state}
                size={96}
                value={state === "milestone" ? 7 : 3}
              />
              <figcaption>
                {c.names[name]} · {c.states[state]}
              </figcaption>
            </figure>
          )),
        )}
      </div>
      <h2>{c.sizes}</h2>
      <div className="icon-gallery-grid">
        {([24, 32, 48, 96] as const).map((size) => (
          <figure key={size}>
            <Icon name="streak" state="active" size={size} />
            <figcaption>{size}</figcaption>
          </figure>
        ))}
      </div>
      <h2>{c.mentors}</h2>
      <div className="icon-gallery-grid">
        {(["volt", "oma", "rezik"] as const).map((name, i) => (
          <figure key={name}>
            <CabinetArt name={name} alt="" size={96} />
            <figcaption>{mentorDeck[i][1]}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
