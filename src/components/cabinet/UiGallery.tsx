"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState } from "react";
import {
  Action,
  Card,
  ProgressBar,
  SkillBar,
  Pill,
  Tabs,
  Modal,
  Tooltip,
  Avatar,
  StatChip,
  GradientCard,
  HorizontalShelf,
} from "./ui";
export default function UiGallery() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("0");
  return (
    <div className="cab-stack">
      <h1>{uiCopy.text045}</h1>
      <Card>
        <div className="cab-row">
          <Avatar>{uiCopy.text004}</Avatar>
          <Pill>{uiCopy.text046}</Pill>
          <StatChip value={10} label={uiCopy.text047} />
          <Tooltip text={uiCopy.text048}>{uiCopy.text049}</Tooltip>
        </div>
        <SkillBar title={uiCopy.text050} value={65} />
        <ProgressBar value={40} label={uiCopy.text051} />
        <Tabs
          items={[
            { id: "0", title: uiCopy.text040 },
            { id: "1", title: uiCopy.text052 },
          ]}
          value={tab}
          onChange={setTab}
          label={uiCopy.text053}
        />
        <Action onClick={() => setOpen(true)}>{uiCopy.text054}</Action>
      </Card>
      <div className="cab-grid-3">
        {(["forest", "amber", "sea"] as const).map((t) => (
          <GradientCard tone={t} key={t}>
            <h2>{uiCopy.text055}</h2>
          </GradientCard>
        ))}
      </div>
      <HorizontalShelf title={uiCopy.text056}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            {uiCopy.text057}
            {i}
          </Card>
        ))}
      </HorizontalShelf>
      {open && (
        <Modal title={uiCopy.text058} onClose={() => setOpen(false)}>
          <p>{uiCopy.text059}</p>
        </Modal>
      )}
    </div>
  );
}
