"use client";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import RewardIcon from "@/components/icons/RewardIcon";
import { useRef, useState } from "react";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { shopItems, buyLocal } from "@/domain/shop";
import { useProgress } from "@/lib/useProgress";
import { browserSupabase } from "@/lib/supabase/client";
import { Card, Action, Tabs } from "@/components/cabinet/ui";
export default function ShopPage() {
  const { progress: p, update, refreshAccount, notify } = useProgress();
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("0");
  const pending = useRef(false);
  async function buy(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(id);
    try {
      if (p.account?.userId) {
        const client = browserSupabase();
        if (!client) throw Error();
        const { error } = await client.rpc("buy_item", {
          item_id: id,
          request_id: crypto.randomUUID(),
        });
        if (error) throw error;
        await refreshAccount();
      } else update((x) => buyLocal(x, id));
    } catch {
      notify(c.offline);
    } finally {
      pending.current = false;
      setBusy("");
    }
  }
  return (
    <div className="cab-stack kids-shop">
      <div className="cab-row">
        <h1>{c.shop}</h1>
        <p className="cab-pill kids-sparks">
          <RewardIcon kind="spark" /> {p.sparks} {c.sparkUnits}
        </p>
      </div>
      <Tabs
        label={c.shop}
        value={tab}
        onChange={setTab}
        items={k.shopTabs.map((title, index) => ({ id: String(index), title }))}
      />
      {k.shopTabs.map(
        (title, index) =>
          String(index) === tab && (
            <section className="cab-stack" key={title}>
              <h2>{title}</h2>
              <div className="dash-shop-grid">
                {shopItems
                  .filter((i) => i.kind === index)
                  .map((item) => {
                    const bought =
                      item.oneTime && p.inventory?.includes(item.id);
                    return (
                      <Card key={item.id} className="dash-shop-item">
                        <span className="dash-item-symbol" aria-hidden="true">
                          <RewardIcon
                            kind={
                              index === 0
                                ? "token"
                                : index === 1
                                  ? "level"
                                  : "xp"
                            }
                          />
                        </span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <strong>
                          <RewardIcon kind="spark" /> {item.price}{" "}
                          {c.sparkUnits}
                        </strong>
                        <Action
                          disabled={!!busy || bought || p.sparks < item.price}
                          onClick={() => buy(item.id)}
                        >
                          {bought
                            ? c.bought
                            : p.sparks < item.price
                              ? `${c.missing} ${item.price - p.sparks} ${c.sparkUnits}`
                              : c.buy}
                        </Action>
                      </Card>
                    );
                  })}
              </div>
            </section>
          ),
      )}
      <Card>
        <h2>{c.inventory}</h2>
        {!p.inventory?.length ? (
          <p>{c.emptyInventory}</p>
        ) : (
          <ul>
            {p.inventory.map((id) => (
              <li key={id}>{shopItems.find((i) => i.id === id)?.title}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
