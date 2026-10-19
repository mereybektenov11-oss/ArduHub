"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useRouter } from "next/navigation";
import { levels, lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { cabinetRu as c } from "@/content/cabinet.ru";
import CabinetArt, { type ArtName } from "@/components/cabinet/CabinetArt";
import CabinetIcon from "@/components/cabinet/CabinetIcon";
import { Pill } from "@/components/cabinet/ui";
const positions = [
  [17, 68],
  [35, 43],
  [53, 66],
  [68, 33],
  [83, 54],
];
export default function IslandMap() {
  const { progress: p, notify } = useProgress(),
    router = useRouter();
  return (
    <div className="cab-stack cab-map">
      <div className="cab-row">
        <div>
          <p className="cab-eyebrow">{uiCopy.text064}</p>
          <h1>{c.mapTitle}</h1>
          <p className="cab-lead">{c.mapIntro}</p>
        </div>
        <Pill>
          {lessons.filter((l) => p.lessons[l.id].status === "done").length}{" "}
          {uiCopy.text065} {lessons.length} {uiCopy.text066}
        </Pill>
      </div>
      <div className="cab-island" data-tour="island">
        <CabinetArt
          name="island"
          alt={uiCopy.text067}
          className="cab-island-bitmap"
        />
        <div className="cab-island-caption">
          <span>{uiCopy.text068}</span>
          <strong>
            {uiCopy.text069}
            <br />
            {uiCopy.text070}
          </strong>
        </div>
        <svg
          className="cab-island-art"
          viewBox="0 0 1000 600"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="island-fill" x2="0" y2="1">
              <stop stopColor="var(--board)" />
              <stop offset="1" stopColor="var(--forest-700)" />
            </linearGradient>
          </defs>
          <ellipse
            cx="530"
            cy="425"
            rx="420"
            ry="100"
            fill="var(--ink-900)"
            opacity=".4"
          />
          <path
            d="M70 375 235 200 440 225 570 120 800 200 940 350 800 480 570 440 350 525 150 460Z"
            fill="url(#island-fill)"
            stroke="var(--board-line)"
            strokeWidth="5"
          />
          <g fill="none" stroke="var(--amber-500)" strokeWidth="7" opacity=".8">
            <path d="M170 408 230 310 350 260 450 310 530 396 600 330 680 198 750 245 830 324" />
            <path d="M180 415v50h160v-40h140m200-220h90v-40h70" />
          </g>
          <g fill="var(--cream-100)" stroke="var(--ink-800)" strokeWidth="8">
            <rect x="165" y="330" width="42" height="55" rx="18" />
            <rect x="330" y="215" width="50" height="35" rx="5" />
            <path d="M510 340h50v-35h-50z" />
            <path d="M665 155h45v-35h-45z" />
            <rect x="800" y="270" width="60" height="35" rx="6" />
          </g>
        </svg>
        <svg
          className="cab-map-path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M17 68Q25 30 35 43T53 66T68 33T83 54" />
        </svg>
        {levels.map((level, i) => {
          const total = lessons.filter((l) => l.levelId === i),
            done = total.filter(
              (l) => p.lessons[l.id].status === "done",
            ).length,
            locked = i > p.profile.level;
          return (
            <button
              key={i}
              className={`cab-level-node ${locked ? "is-locked" : done === total.length ? "is-done" : "is-current"}`}
              style={
                {
                  "--node-x": `${positions[i][0]}%`,
                  "--node-y": `${positions[i][1]}%`,
                } as React.CSSProperties
              }
              aria-label={uiCopy.text071(
                i,
                level.zoneName,
                locked ? uiCopy.text087 : "",
              )}
              onClick={() =>
                locked ? notify(uiCopy.text072) : router.push(`/app/map/${i}`)
              }
            >
              <span className="cab-node-orb">
                <svg viewBox="0 0 72 72" aria-hidden="true">
                  <circle cx="36" cy="36" r="32" />
                  <circle
                    cx="36"
                    cy="36"
                    r="32"
                    strokeDasharray={`${(done / total.length) * 201} 201`}
                  />
                </svg>
                <span aria-hidden="true">
                  {locked ? (
                    <CabinetIcon name="lock" />
                  ) : done === total.length ? (
                    "✓"
                  ) : (
                    <CabinetArt
                      name={
                        (
                          ["volt", "oma", "rezik", "shina", "volt"] as ArtName[]
                        )[i]
                      }
                      alt={level.name}
                      size={52}
                    />
                  )}
                </span>
              </span>
              <span className="cab-node-title">
                {level.zoneName}
                <small>
                  {locked ? uiCopy.text073 : uiCopy.text074(done, total.length)}{" "}
                  {uiCopy.text019}
                  {i}
                </small>
              </span>
            </button>
          );
        })}
        <div className="cab-map-legend">
          <span>{uiCopy.text075}</span>
          <span>{uiCopy.text076}</span>
          <span>{uiCopy.text077}</span>
        </div>
      </div>
      <p className="cab-small cab-muted">{uiCopy.text078}</p>
    </div>
  );
}
