import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { lessonQuizzes } from "../../src/content/lesson-quiz.ru";
let db: PGlite;
const A = "00000000-0000-4000-8000-000000000011",
  B = "00000000-0000-4000-8000-000000000012";
function done(n = 10) {
  return {
    lessons: Object.fromEntries(
      Array.from({ length: n }, (_, i) => {
        const id = `lesson-${i + 1}`;
        return [
          id,
          {
            status: "done",
            attempts: 1,
            bestErrors: 0,
            video: { confirmed: true },
            stages: { video: true, test: true, practice: true },
            practice: { circuit: true, code: true, run: true },
            quiz: {
              phase: "result",
              answers: Object.fromEntries(
                lessonQuizzes[id].map((q, i) => [`q${i + 1}`, q.correct]),
              ),
            },
          },
        ];
      }),
    ),
  };
}
async function asUser(id: string, query: string, params: unknown[] = []) {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${id}';set role authenticated;`,
  );
  try {
    return await db.query<Record<string, unknown>>(query, params);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  for (const file of [
    "20261017131620_dashboard_auth.sql",
    "20261021075810_lesson_flow_rewards.sql",
    "20261021082200_lesson_quiz_reward_receipts.sql",
    "20261025154502_progress_evidence_fallback_rewards.sql",
    "20261026164000_achievement_rewards.sql",
  ])
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.exec(
    `insert into auth.users values('${A}','{"display_name":"Искра","role":"student"}'),('${B}','{"display_name":"Друг","role":"student"}');insert into public.progress values('${A}','{}'),('${B}','{}');`,
  );
}, 30000);
beforeEach(async () => {
  await db.exec(
    "reset role;delete from public.user_achievements;delete from private.achievement_events;delete from public.projects;delete from public.xp_events;",
  );
  await db.query(
    "update public.profiles set sparks=100,inventory='[]'::jsonb where id=$1",
    [A],
  );
  await db.query("update public.progress set data=$1::jsonb where user_id=$2", [
    JSON.stringify(done()),
    A,
  ]);
});
afterAll(async () => {
  await db?.close();
});
describe("atomic sticker rewards and permissions", () => {
  for (const id of [
    "first-light",
    "light-bearer",
    "perfect",
    "check-master",
    "electrician",
  ])
    it(`checks completed evidence for ${id}`, async () => {
      const good = await db.query<{ ok: boolean }>(
        "select private.achievement_eligible($1,$2::jsonb,'[]',null) ok",
        [id, JSON.stringify(done())],
      );
      expect(good.rows[0].ok).toBe(true);
      const bad = await db.query<{ ok: boolean }>(
        "select private.achievement_eligible($1,'{}','[]',null) ok",
        [id],
      );
      expect(bad.rows[0].ok).toBe(false);
    });
  const other = [
    ["buyer", {}, ["oma"], null],
    ["inventor", { achievementStats: { projectIds: ["p1"] } }, [], null],
    [
      "mentor-friend",
      {
        achievementStats: {
          mentorQuestionIds: Array.from({ length: 10 }, (_, i) => String(i)),
        },
      },
      [],
      null,
    ],
    ["speed", { achievementStats: { blitzBest: 10 } }, [], null],
    [
      "explorer",
      {
        achievementStats: {
          topics: [
            "leds",
            "buttons",
            "sensors",
            "motors",
            "display",
            "projects",
          ],
        },
      },
      [],
      null,
    ],
    [
      "seven-days",
      {
        achievementStats: {
          activityDates: Array.from({ length: 7 }, (_, i) =>
            new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
          ),
        },
      },
      [],
      null,
    ],
    ["weekly-best", {}, [], 3],
  ];
  for (const [id, data, inventory, rank] of other)
    it(`checks ${id} in both directions`, async () => {
      const good = await db.query<{ ok: boolean }>(
        "select coalesce(private.achievement_eligible($1,$2::jsonb,$3::jsonb,$4::bigint),false) ok",
        [id, JSON.stringify(data), JSON.stringify(inventory), rank],
      );
      expect(good.rows[0].ok).toBe(true);
      const bad = await db.query<{ ok: boolean }>(
        "select coalesce(private.achievement_eligible($1,'{}','[]',null),false) ok",
        [id],
      );
      expect(bad.rows[0].ok).toBe(false);
    });
  it("credits five sparks once, with no caller-supplied amount", async () => {
    const first = await asUser(
      A,
      "select public.claim_achievement('first-light') result",
    );
    expect(first.rows[0].result).toEqual({ claimed: true, sparks: 105 });
    const repeat = await asUser(
      A,
      "select public.claim_achievement('first-light') result",
    );
    expect(repeat.rows[0].result).toEqual({ claimed: false, sparks: 105 });
    expect(
      (
        await db.query(
          "select * from public.user_achievements where awarded_at is not null",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("rejects forged status, unknown IDs and client-provided top-three rank", async () => {
    await db.exec("delete from public.user_achievements");
    await db.query(
      "update public.progress set data=$1::jsonb where user_id=$2",
      [
        JSON.stringify({
          lessons: { "lesson-1": { status: "done" } },
          achievementStats: { bestWeeklyRank: 1 },
        }),
        A,
      ],
    );
    await expect(
      asUser(A, "select public.claim_achievement('first-light')"),
    ).rejects.toThrow(/achievement_locked/);
    await expect(
      asUser(A, "select public.claim_achievement('made-up')"),
    ).rejects.toThrow(/achievement_locked/);
    await expect(
      asUser(A, "select public.claim_achievement('weekly-best')"),
    ).rejects.toThrow(/achievement_locked/);
  });
  it("enables owner-only RLS and prevents direct insert/update", async () => {
    await asUser(A, "select public.claim_achievement('first-light')");
    expect(
      (await asUser(B, "select * from public.user_achievements")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        B,
        `insert into public.user_achievements(user_id,achievement_id) values('${B}','first-light')`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(B, "update public.user_achievements set achievement_id='buyer'"),
    ).rejects.toThrow(/permission denied/);
    const result = await db.query<{ rowsecurity: boolean }>(
      "select rowsecurity from pg_tables where schemaname='public' and tablename='user_achievements'",
    );
    expect(result.rows[0].rowsecurity).toBe(true);
  });
  it("ignores forged client game, project and mentor statistics", async () => {
    await db.exec("delete from public.user_achievements");
    await db.query(
      "update public.progress set data=$1::jsonb where user_id=$2",
      [
        JSON.stringify({
          achievementStats: {
            projectIds: ["fake"],
            mentorQuestionIds: Array.from({ length: 10 }, (_, i) => String(i)),
            blitzBest: 100,
            topics: [
              "leds",
              "buttons",
              "sensors",
              "motors",
              "display",
              "projects",
            ],
          },
        }),
        A,
      ],
    );
    for (const id of ["inventor", "mentor-friend", "speed", "explorer"])
      await expect(
        asUser(A, "select public.claim_achievement($1)", [id]),
      ).rejects.toThrow(/achievement_locked/);
    await expect(
      asUser(
        A,
        "select public.record_achievement_event($1,gen_random_uuid(),'mentor')",
        [A],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("records mentor evidence idempotently and retains earned rights after stale saves", async () => {
    for (let i = 0; i < 10; i++)
      await db.query("select public.record_achievement_event($1,$2,'mentor')", [
        A,
        `00000000-0000-4000-8000-${String(i + 100).padStart(12, "0")}`,
      ]);
    await db.query("select public.record_achievement_event($1,$2,'mentor')", [
      A,
      "00000000-0000-4000-8000-000000000100",
    ]);
    expect(
      (
        await db.query(
          "select * from private.achievement_events where user_id=$1",
          [A],
        )
      ).rows,
    ).toHaveLength(10);
    await asUser(A, "select public.claim_achievement('mentor-friend')");
    await db.query("update public.progress set data='{}' where user_id=$1", [
      A,
    ]);
    const p = await db.query<{
      data: { achievements: { claimed: string[]; unlocked: string[] } };
    }>("select data from public.progress where user_id=$1", [A]);
    expect(p.rows[0].data.achievements.claimed).toContain("mentor-friend");
    expect(p.rows[0].data.achievements.unlocked).toContain("mentor-friend");
    expect(
      (
        await asUser(
          A,
          "select public.claim_achievement('mentor-friend') result",
        )
      ).rows[0].result,
    ).toEqual({ claimed: false, sparks: 105 });
  });
  it("resets a blitz chain on a wrong answer and rewards ten consecutive successes", async () => {
    for (let i = 0; i < 20; i++)
      await db.query(
        "select public.record_achievement_event($1,gen_random_uuid(),'blitz',$2,'leds')",
        [A, i !== 9],
      );
    expect(
      (await asUser(A, "select public.claim_achievement('speed') result"))
        .rows[0].result,
    ).toEqual({ claimed: true, sparks: 105 });
  });
  it("retains first-project rights after deleting the actual project", async () => {
    await db.query(
      "insert into public.projects(user_id,title,scene,code) values($1,'Real project','{}','')",
      [A],
    );
    await db.query("delete from public.projects where user_id=$1", [A]);
    expect(
      (await asUser(A, "select public.claim_achievement('inventor') result"))
        .rows[0].result,
    ).toEqual({ claimed: true, sparks: 105 });
  });
  it("derives seven-day eligibility from actual XP dates in the account timezone", async () => {
    await db.query(
      "update public.profiles set timezone='Asia/Almaty' where id=$1",
      [A],
    );
    await db.query(
      "insert into public.xp_events(user_id,amount,source,ref_id,created_at) select $1,1,'game','streak-'||i,'2026-10-20 20:00:00+00'::timestamptz+i*interval '1 day' from generate_series(0,6) i",
      [A],
    );
    const eligible = async (day: string) =>
      (
        await db.query<{ ok: boolean }>(
          "select private.achievement_eligible('seven-days',private.achievement_evidence_data($1,'{}'),'[]',null,$2::date) ok",
          [A, day],
        )
      ).rows[0].ok;
    expect(await eligible("2026-10-27")).toBe(true);
    expect(await eligible("2026-10-28")).toBe(true);
    expect(await eligible("2026-10-29")).toBe(false);
    await db.query("update public.profiles set timezone='UTC' where id=$1", [
      A,
    ]);
    expect(await eligible("2026-10-28")).toBe(false);
    await db.query(
      "delete from public.xp_events where user_id=$1 and ref_id='streak-3'",
      [A],
    );
    expect(await eligible("2026-10-27")).toBe(false);
  });
  it("rejects forged streak and frozen dates without actual activity", async () => {
    await db.query(
      "update public.progress set data=$1::jsonb where user_id=$2",
      [
        JSON.stringify({
          streak: {
            count: 7,
            lastActiveDate: new Date().toISOString().slice(0, 10),
            frozenDates: ["2026-10-21"],
          },
          achievementStats: {
            activityDates: Array.from({ length: 7 }, (_, i) =>
              new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
            ),
          },
        }),
        A,
      ],
    );
    await expect(
      asUser(A, "select public.claim_achievement('seven-days')"),
    ).rejects.toThrow(/achievement_locked/);
  });
});
