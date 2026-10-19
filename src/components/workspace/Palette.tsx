"use client";
import { catalog, type PartType } from "@/domain/parts/catalog";
import { learningRu as c } from "@/content/learning.ru";
import PartView from "./PartView";
import { useState } from "react";
import { partCategories, paletteCopy as text } from "@/content/parts.ru";
import { compilerLibraries } from "@/domain/parts/catalog.overrides";
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
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all");
  const filtered = types.filter(
    (type) =>
      (category === "all" || catalog[type].category === category) &&
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
              0.6,
              48 / catalog[type].width,
              40 / catalog[type].height,
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
        <select
          aria-label={text.all}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">{text.all}</option>
          {Object.entries(partCategories)
            .filter(([key]) =>
              types.some((type) => catalog[type].category === key),
            )
            .map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
        </select>
      </div>
      {row(filtered)}
      {!filtered.length && <p className="l2-note">{text.empty}</p>}
    </>
  );
}
