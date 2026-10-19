import { readFile, writeFile } from "node:fs/promises";
import { shopDeck as shopItems } from "../src/content/shop.ru.ts";
const file = "supabase/migrations/20261017131620_dashboard_auth.sql";
const base = (await readFile(file, "utf8")).split("-- SHOP SEED")[0];
const q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const rows = shopItems.map((item) => {
  const payload = Object.fromEntries(
    ["tokens", "hints", "freeze", "mentor", "frame"]
      .filter((k) => k in item)
      .map((k) => [k, item[k]]),
  );
  return `(${q(item.id)},${q(["mentor", "boost", "frame"][item.kind])},${q(item.title)},${q(item.description)},${item.price},${item.oneTime},${q(JSON.stringify(payload))}::jsonb,true)`;
});
await writeFile(
  file,
  base +
    "-- SHOP SEED\ninsert into public.shop_items(id,kind,title,description,price_sparks,one_time,payload,active) values\n" +
    rows.join(",\n") +
    ";\n",
);
console.log("Shop catalog SQL seeded: " + rows.length + " items");
