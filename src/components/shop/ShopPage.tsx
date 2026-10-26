"use client";
import { useEffect, useRef, useState } from "react";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { motionSoundRu as g } from "@/content/motion-sound.ru";
import { shopItems, buyLocal } from "@/domain/shop";
import { useProgress } from "@/lib/useProgress";
import { browserSupabase } from "@/lib/supabase/client";
import { Card, Action, Tabs, Modal } from "@/components/cabinet/ui";
import Icon from "@/components/icons/Icon";
import AnimatedCount from "@/components/icons/AnimatedCount";
import CabinetArt, { type ArtName } from "@/components/cabinet/CabinetArt";
import { RewardFly } from "@/components/feedback/EventFeedback";
import { playSfx } from "@/lib/sfx";
type Item = (typeof shopItems)[number];
function ItemArt({ item }: { item: Item }) {
  if ("mentor" in item)
    return <CabinetArt name={item.mentor as ArtName} size={96} alt="" />;
  if ("frame" in item)
    return (
      <span className={`cab-avatar g3-frame-example frame-${item.frame}`}>
        <Icon name="frame" size={48} />
      </span>
    );
  return (
    <span className="g3-item-art">
      <Icon
        name={
          "freeze" in item ? "freeze" : "hints" in item ? "hints" : "tokens"
        }
        size={96}
      />
      {"hints" in item && <b>3</b>}
    </span>
  );
}
export default function ShopPage() {
  const { progress: p, update, refreshAccount, notify } = useProgress();
  const [busy, setBusy] = useState(""),
    [tab, setTab] = useState("0"),
    [confirm, setConfirm] = useState<Item | null>(null),
    [purchased, setPurchased] = useState(""),
    [denied, setDenied] = useState("");
  const pending = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function deny(id: string) {
    setDenied("");
    requestAnimationFrame(() => setDenied(id));
    playSfx("deny");
  }
  async function buy(item: Item) {
    if (pending.current) return;
    if (p.sparks < item.price) {
      deny(item.id);
      return;
    }
    pending.current = true;
    setBusy(item.id);
    try {
      if (p.account?.userId) {
        const client = browserSupabase();
        if (!client) throw Error();
        const { error } = await client.rpc("buy_item", {
          item_id: item.id,
          request_id: crypto.randomUUID(),
        });
        if (error) {
          if (/insufficient|not_enough/i.test(error.message)) {
            deny(item.id);
            return;
          }
          throw error;
        }
        await refreshAccount();
      } else {
        let changed = false;
        update((x) => {
          const next = buyLocal(x, item.id);
          changed = next !== x;
          return next;
        });
        if (!changed) {
          deny(item.id);
          return;
        }
      }
      setPurchased(item.id);
      setDenied("");
      playSfx("purchase");
    } catch {
      notify(c.offline);
    } finally {
      timer.current = setTimeout(() => {
        pending.current = false;
        setBusy("");
        setConfirm(null);
      }, 750);
    }
  }
  function requestBuy(item: Item) {
    if (pending.current) return;
    if (p.sparks < item.price) {
      deny(item.id);
      return;
    }
    if (item.price >= 60) setConfirm(item);
    else void buy(item);
  }
  async function equip(item: Item) {
    if (!p.inventory?.includes(item.id)) return;
    if ("mentor" in item)
      update((x) => ({
        ...x,
        mentor: { ...x.mentor, selectedId: item.mentor },
      }));
    if ("frame" in item) {
      if (p.account?.userId) {
        const client = browserSupabase();
        if (!client) return;
        const { error } = await client
          .from("profiles")
          .update({ avatar_frame: item.frame })
          .eq("id", p.account.userId);
        if (error) {
          notify(c.offline);
          return;
        }
      }
      update((x) => ({
        ...x,
        account: {
          ...x.account,
          role: x.account?.role ?? "student",
          timezone: x.account?.timezone ?? "Asia/Almaty",
          avatarFrame: item.frame,
        },
      }));
    }
  }
  const inventory = p.inventory ?? [];
  const renderItem = (item: Item, ownedView = false) => {
    const bought = inventory.includes(item.id),
      selected =
        "frame" in item
          ? p.account?.avatarFrame === item.frame
          : "mentor" in item
            ? p.mentor.selectedId === item.mentor
            : false;
    return (
      <Card
        key={item.id}
        className={`dash-shop-item ${purchased === item.id ? "g3-purchase" : ""} ${denied === item.id ? "g3-denied" : ""}`}
      >
        <ItemArt item={item} />
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {purchased === item.id && (
          <>
            <span className="g3-purchase-stamp">{g.bought}</span>
            <RewardFly
              key={purchased + p.sparks}
              target="[data-inventory-target]"
            />
          </>
        )}
        {!ownedView && (
          <strong>
            <Icon name="sparks" /> {item.price} {c.sparkUnits}
          </strong>
        )}
        {bought && ("frame" in item || "mentor" in item) ? (
          <Action
            secondary
            disabled={selected}
            onClick={() => void equip(item)}
          >
            {selected ? g.selected : "frame" in item ? g.equip : g.select}
          </Action>
        ) : (
          !ownedView && (
            <Action
              disabled={!!busy || (bought && item.oneTime)}
              onClick={() => requestBuy(item)}
            >
              {bought && item.oneTime
                ? g.bought
                : p.sparks < item.price
                  ? `${c.missing} ${item.price - p.sparks} ${c.sparkUnits}`
                  : c.buy}
            </Action>
          )
        )}
      </Card>
    );
  };
  return (
    <div className="cab-stack kids-shop">
      <div className="cab-row">
        <h1>{c.shop}</h1>
        <div className="cab-pill kids-sparks" data-reward-target="sparks">
          <Icon name="sparks" state={purchased ? "spend" : "idle"} />
          <AnimatedCount value={p.sparks} /> {c.sparkUnits}
          {purchased && <RewardFly key={p.sparks} direction="spend" />}
        </div>
      </div>
      <div
        data-inventory-target
        key={inventory.length}
        className={purchased ? "g3-inventory-bump" : undefined}
      >
        <Tabs
          label={c.shop}
          value={tab}
          onChange={setTab}
          items={[
            ...k.shopTabs.map((title, index) => ({ id: String(index), title })),
            { id: "inventory", title: `${g.inventory} (${inventory.length})` },
          ]}
        />
      </div>
      {tab === "inventory" ? (
        <section className="cab-stack">
          <h2>{g.inventory}</h2>
          {!inventory.length ? (
            <p>{c.emptyInventory}</p>
          ) : (
            <div className="dash-shop-grid">
              {shopItems
                .filter((item) => inventory.includes(item.id))
                .map((item) => renderItem(item, true))}
            </div>
          )}
        </section>
      ) : (
        <section className="cab-stack">
          <h2>{k.shopTabs[Number(tab)]}</h2>
          <div className="dash-shop-grid">
            {shopItems
              .filter((item) => item.kind === Number(tab))
              .map((item) => renderItem(item))}
          </div>
        </section>
      )}
      {confirm && (
        <Modal
          title={g.confirm(confirm.price)}
          onClose={() => {
            if (!pending.current) setConfirm(null);
          }}
        >
          <div className="cab-stack">
            <ItemArt item={confirm} />
            <h2>{confirm.title}</h2>
            <p>{confirm.description}</p>
            <div className="cab-row">
              <Action disabled={!!busy} onClick={() => void buy(confirm)}>
                {g.buy}
              </Action>
              <Action
                secondary
                disabled={!!busy}
                onClick={() => setConfirm(null)}
              >
                {g.cancel}
              </Action>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
