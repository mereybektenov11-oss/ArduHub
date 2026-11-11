"use client";
import { catalog, type PartType } from "@arduhub/arduino-core/parts/catalog";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import PartView from "./PartView";
import { useState } from "react";
import {
  partCategories,
  paletteCopy as text,
} from "@arduhub/curriculum/parts.ru";
import { compilerLibraries } from "@arduhub/arduino-core/parts/catalog.overrides";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
export default function Palette({
  types,
  busy,
  atLimit,
  hasBoard,
  onAdd,
}: {
  types: PartType[];
  busy: boolean;
  atLimit: boolean;
  hasBoard: boolean;
  onAdd: (type: PartType) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = types.filter((type) =>
    `${catalog[type].name} ${catalog[type].tag}`
      .toLocaleLowerCase("ru")
      .includes(query.toLocaleLowerCase("ru")),
  );
  const row = (items: PartType[]) => (
    <div className="l2-palette" aria-label={c.palette}>
      {items.map((type) => (
        <button
          key={type}
          draggable={!busy && !atLimit && !(type === "uno" && hasBoard)}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-arduhub-part", type);
            e.dataTransfer.effectAllowed = "copy";
          }}
          title={
            catalog[type].simulated ? catalog[type].name : c.appearanceOnly
          }
          disabled={busy || atLimit || (type === "uno" && hasBoard)}
          onClick={() => onAdd(type)}
        >
          <PartView
            type={type}
            attrs={catalog[type].attrs}
            lazy
            scale={Math.min(
              0.85,
              96 / catalog[type].width,
              64 / catalog[type].height,
            )}
          />
          <span>{catalog[type].name}</span>
          <small>
            {catalog[type].simulated ? text.working : c.appearanceOnly}
          </small>
          {catalog[type].libraries.some(
            (l) => !compilerLibraries.includes(l),
          ) && (
            <small>
              {text.unavailableLibrary}: {catalog[type].libraries.join(", ")}
            </small>
          )}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <div className="l2-tools">
        <input
          aria-label={text.search}
          placeholder={text.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {[
        {
          id: "basic",
          title: k.basic,
          types: filtered.filter((type) =>
            [
              "uno",
              "breadboard",
              "led",
              "resistor",
              "button",
              "pot",
              "buzzer",
            ].includes(type),
          ),
        },
        ...Object.entries(partCategories).map(([id, title]) => ({
          id,
          title,
          types: filtered.filter(
            (type) =>
              ![
                "uno",
                "breadboard",
                "led",
                "resistor",
                "button",
                "pot",
                "buzzer",
              ].includes(type) && catalog[type].category === id,
          ),
        })),
      ]
        .filter((group) => group.types.length)
        .map((group) => (
          <details
            className="kids-palette-group"
            key={group.id}
            open={group.id === "basic" || query ? true : undefined}
          >
            <summary>
              {group.title} <span>{group.types.length}</span>
            </summary>
            {row(group.types)}
          </details>
        ))}
      {!filtered.length && <p className="l2-note">{text.empty}</p>}
    </>
  );
}
