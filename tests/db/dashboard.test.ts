import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
let db: PGlite;
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
async function asUser(id: string, sql: string) {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${id}';set role authenticated;`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261017131620_dashboard_auth.sql",
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users values('${A}','{"display_name":"Лис","role":"student"}'),('${B}','{"display_name":"Робот","role":"teacher"}');insert into public.progress values('${A}','{"lessons":{"lesson-1":{"status":"done","attempts":1,"bestErrors":0},"lesson-2":{"status":"done","attempts":1,"bestErrors":0}}}'),('${B}','{}');insert into public.drafts(user_id,lesson_id,scene,code) values('${B}','lesson-1','{}','');insert into public.projects(user_id,title,scene,code) values('${B}','Hidden','{}','');`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("ArduHub PostgreSQL migration and security", () => {
  it("enables RLS on all account tables", async () => {
    const result = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('profiles','progress','drafts','projects','xp_events','mission_progress','shop_items','purchases')",
    );
    expect(result.rows).toHaveLength(8);
    expect(result.rows.every((r) => r.rowsecurity)).toBe(true);
  });
  it("creates profiles from auth metadata", async () => {
    const r = await asUser(B, "select role,display_name from public.profiles");
    expect(r.rows).toEqual([{ role: "teacher", display_name: "Робот" }]);
  });
  for (const table of ["progress", "drafts", "projects", "purchases"])
    it(`RLS hides and protects B ${table} from A`, async () => {
      const selected = await asUser(
        A,
        `select * from public.${table} where user_id='${B}'`,
      );
      expect(selected.rows).toHaveLength(0);
      if (table !== "purchases" && table !== "progress") {
        const changed = await asUser(
          A,
          `delete from public.${table} where user_id='${B}' returning *`,
        );
        expect(changed.rows).toHaveLength(0);
      }
    });
  it("does not grant direct balance edits", async () => {
    await expect(
      asUser(A, "update public.profiles set sparks=10000"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(
        A,
        `insert into public.xp_events(user_id,amount,source,ref_id) values('${A}',500,'game','fake')`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("awards lesson only once and tracks missions", async () => {
    await asUser(A, "select public.award('lesson','lesson-1',30)");
    await expect(
      asUser(A, "select public.award('lesson','lesson-1',30)"),
    ).rejects.toThrow(/already_awarded/);
    await asUser(A, "select public.award('lesson','lesson-2',30)");
    const r = await asUser(A, "select sparks from public.profiles");
    expect(r.rows).toEqual([{ sparks: 60 }]);
  });
  it("claims mission reward only once", async () => {
    const day = (
      await db.query<{ day: string }>(
        `select (now() at time zone 'Asia/Almaty')::date::text as day`,
      )
    ).rows[0].day;
    await asUser(A, `select public.award('mission','${day}',5)`);
    await expect(
      asUser(A, `select public.award('mission','${day}',5)`),
    ).rejects.toThrow(/already_awarded/);
    const r = await asUser(
      A,
      "select sparks,mentor_tokens from public.profiles",
    );
    expect(r.rows).toEqual([{ sparks: 70, mentor_tokens: 55 }]);
  });
  it("buy_item is atomic and request is idempotent", async () => {
    await db.exec(`update public.profiles set sparks=100 where id='${A}'`);
    const request = "10000000-0000-4000-8000-000000000001";
    await asUser(A, `select public.buy_item('freeze','${request}')`);
    await asUser(A, `select public.buy_item('freeze','${request}')`);
    await expect(asUser(A, "select public.buy_item('freeze')")).rejects.toThrow(
      /already_purchased/,
    );
    const r = await asUser(
      A,
      "select sparks,freeze_count from public.profiles",
    );
    expect(r.rows).toEqual([{ sparks: 60, freeze_count: 1 }]);
    await expect(asUser(A, "select public.buy_item('shina')")).rejects.toThrow(
      /insufficient_sparks/,
    );
  });
  it("concurrent spending cannot overdraw tokens", async () => {
    await db.exec(
      `update public.profiles set mentor_tokens=1 where id='${A}';set request.jwt.claim.sub='${A}';set role authenticated`,
    );
    const results = await Promise.allSettled([
      db.query("select public.spend_mentor_tokens(1)"),
      db.query("select public.spend_mentor_tokens(1)"),
    ]);
    await db.exec("reset role");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const r = await asUser(A, "select mentor_tokens from public.profiles");
    expect(r.rows).toEqual([{ mentor_tokens: 0 }]);
  });
  it("caps daily XP at 500", async () => {
    for (let i = 0; i < 4; i++)
      await asUser(A, `select public.award('game','cap-${i}',100)`);
    await expect(
      asUser(A, "select public.award('game','too-many',100)"),
    ).rejects.toThrow(/daily_cap/);
  });
  it("leaderboard omits hidden users and has no emails", async () => {
    await db.exec(
      `update public.profiles set hide_from_leaderboard=true where id='${A}';insert into public.xp_events(user_id,amount,source,ref_id) values('${B}',10,'game','example');`,
    );
    const r = await asUser(
      B,
      "select * from public.get_weekly_leaderboard(20)",
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ display_name: "Робот", is_self: true });
    expect(JSON.stringify(r.rows)).not.toMatch(/email|@/);
  });
  it("anonymous callers cannot use privileged RPCs", async () => {
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select public.award('game','anon',10)"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("merges completions from two sequential device snapshots", async () => {
    await asUser(
      B,
      `select public.save_progress('{"version":1,"lessons":{"lesson-1":{"status":"done"},"lesson-2":{"status":"locked"}},"sparks":999,"xp":999}')`,
    );
    await asUser(
      B,
      `select public.save_progress('{"version":1,"lessons":{"lesson-1":{"status":"locked"},"lesson-2":{"status":"done"}},"sparks":999,"xp":999}')`,
    );
    const result = await asUser(B, "select data from public.progress");
    const data = result.rows[0].data as {
      lessons: Record<string, { status: string }>;
      sparks: number;
    };
    expect(data.lessons["lesson-1"].status).toBe("done");
    expect(data.lessons["lesson-2"].status).toBe("done");
    expect(data.sparks).not.toBe(999);
  });
  it("consumes purchased hints and rejects overdrawing them", async () => {
    await db.exec(`update public.profiles set hint_count=1 where id='${B}'`);
    await asUser(B, "select public.consume_boost('hint')");
    await expect(
      asUser(B, "select public.consume_boost('hint')"),
    ).rejects.toThrow(/insufficient_boost/);
  });
  it("consumes a streak freeze once for exactly one missing day", async () => {
    await db.exec(
      `update public.profiles set freeze_count=1 where id='${B}';update public.progress set data=jsonb_set(data,'{streak}',jsonb_build_object('count',7,'lastActiveDate',((now() at time zone 'Asia/Almaty')::date-2)::text)) where user_id='${B}'`,
    );
    const used = await asUser(
      B,
      "select public.consume_boost('freeze') as result",
    );
    expect(used.rows[0].result).toEqual({ used: true });
    const again = await asUser(
      B,
      "select public.consume_boost('freeze') as result",
    );
    expect(again.rows[0].result).toEqual({ used: false });
  });
  it("does not equip an unowned avatar frame or invalid timezone", async () => {
    await expect(
      asUser(B, "update public.profiles set avatar_frame='master'"),
    ).rejects.toThrow(/frame_not_owned/);
    await expect(
      asUser(B, "update public.profiles set timezone='invalid-zone'"),
    ).rejects.toThrow(/invalid_timezone/);
  });
});
