import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
let db: PGlite;
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
function completedLesson(id = 1, source = "lesson") {
  const key = id === 1 ? [0, 1, 2, 0, 1, 2] : [1, 0, 2, 1, 0, 2];
  return {
    status: "done",
    attempts: 1,
    bestErrors: 0,
    completionSource: source,
    video: { confirmed: true },
    stages: { video: true, test: true, practice: true },
    practice: { circuit: true, code: true, run: true },
    quiz: {
      phase: "result",
      answers: Object.fromEntries(
        key.map((answer, i) => [`q${i + 1}`, answer]),
      ),
      retryAnswers: {},
    },
  };
}
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
    await readFile(
      "supabase/migrations/20261021075810_lesson_flow_rewards.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261021082200_lesson_quiz_reward_receipts.sql",
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users values('${A}','{"display_name":"Лис","role":"student"}'),('${B}','{"display_name":"Робот","role":"teacher"}');insert into public.progress values('${A}','{"lessons":{"lesson-1":{"status":"done","attempts":1,"bestErrors":0},"lesson-2":{"status":"done","attempts":1,"bestErrors":0}}}'),('${B}','{}');insert into public.drafts(user_id,lesson_id,scene,code) values('${B}','lesson-1','{}','');insert into public.projects(user_id,title,scene,code) values('${B}','Hidden','{}','');`,
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261025154502_progress_evidence_fallback_rewards.sql",
      "utf8",
    ),
  );
  await db.query("update public.progress set data=$1::jsonb where user_id=$2", [
    JSON.stringify({
      lessons: {
        "lesson-1": completedLesson(1),
        "lesson-2": completedLesson(2),
      },
    }),
    A,
  ]);
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
    expect(r.rows).toEqual([{ sparks: 20 }]);
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
    expect(r.rows).toEqual([{ sparks: 30, mentor_tokens: 55 }]);
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
  it("validates quiz answers and awards each question once without sparks", async () => {
    await db.exec(
      `update public.progress set data=jsonb_set(data,'{lessons}', '{"lesson-1":{"stages":{"video":true},"quiz":{"answers":{"q1":0,"q2":0}}}}'::jsonb) where user_id='${B}'`,
    );
    const before = await asUser(B, "select sparks from public.profiles");
    await asUser(B, "select public.award('lesson_quiz','lesson-1:q1',1)");
    await expect(
      asUser(B, "select public.award('lesson_quiz','lesson-1:q1',1)"),
    ).rejects.toThrow(/already_awarded/);
    await expect(
      asUser(B, "select public.award('lesson_quiz','lesson-1:q2',1)"),
    ).rejects.toThrow(/bad_request/);
    await expect(
      asUser(B, "select public.award('lesson_quiz','lesson-1:q3',20)"),
    ).rejects.toThrow(/bad_request/);
    expect(
      (await asUser(B, "select sparks from public.profiles")).rows,
    ).toEqual(before.rows);
  });
});

describe("G1/G4 server evidence and fallback receipts", () => {
  const C = "00000000-0000-4000-8000-000000000003";
  async function setLessons(lessons: Record<string, unknown>, extra = {}) {
    await db.query(
      "insert into public.progress(user_id,data) values($1,$2::jsonb) on conflict(user_id) do update set data=excluded.data",
      [C, JSON.stringify({ progressEvidenceVersion: 1, lessons, ...extra })],
    );
  }
  beforeEach(async () => {
    await db.exec(
      `insert into auth.users values('${C}','{}') on conflict do nothing;delete from public.xp_events where user_id='${C}';delete from public.mission_progress where user_id='${C}';update public.profiles set sparks=0,mentor_tokens=50 where id='${C}'`,
    );
    await setLessons({ "lesson-1": completedLesson(1, "lesson_fallback") });
  });
  it("keeps the server answer keys aligned with every current lesson quiz", async () => {
    const keys = await db.query<{ keys: unknown }>(
      "select private.lesson_answer_keys() as keys",
    );
    expect(keys.rows[0].keys).toEqual(
      Object.fromEntries(
        Object.entries(lessonQuizzes).map(([id, quiz]) => [
          id,
          Object.fromEntries(
            quiz.map((question, index) => [`q${index + 1}`, question.correct]),
          ),
        ]),
      ),
    );
  });
  it.each([
    null,
    {},
    { stages: null, video: null, quiz: null, practice: null },
    {
      stages: { video: true, test: true, practice: true },
      video: { watchedRatio: "0.99" },
      quiz: { phase: "result", answers: null },
    },
  ])(
    "malformed lesson evidence fails closed without a SQL cast error: %j",
    async (lesson) => {
      const result = await db.query<{ stages: unknown }>(
        "select private.lesson_stages($1::jsonb,private.lesson_answer_keys()->'lesson-1') as stages",
        [JSON.stringify(lesson)],
      );
      expect(result.rows[0].stages).toEqual({
        video: false,
        test: false,
        practice: false,
      });
    },
  );
  it("a malformed save rolls back and preserves existing progress and balances", async () => {
    const before = await asUser(C, "select data from public.progress");
    await expect(
      asUser(
        C,
        `select public.save_progress('{"progressEvidenceVersion":1,"lessons":{"lesson-1":null}}')`,
      ),
    ).rejects.toThrow(/bad_request/);
    expect((await asUser(C, "select data from public.progress")).rows).toEqual(
      before.rows,
    );
    expect(
      (await asUser(C, "select sparks,mentor_tokens from public.profiles"))
        .rows,
    ).toEqual([{ sparks: 0, mentor_tokens: 50 }]);
  });
  it("awards exactly half reward once and cannot switch source to collect again", async () => {
    await asUser(C, "select public.award('lesson_fallback','lesson-1',15)");
    expect(
      (await asUser(C, "select sparks,mentor_tokens from public.profiles"))
        .rows,
    ).toEqual([{ sparks: 5, mentor_tokens: 50 }]);
    expect(
      (await asUser(C, "select amount,source from public.xp_events")).rows,
    ).toEqual([{ amount: 15, source: "lesson_fallback" }]);
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
    ).rejects.toThrow(/already_awarded/);
    await setLessons({ "lesson-1": completedLesson(1) });
    await expect(
      asUser(C, "select public.award('lesson','lesson-1',30)"),
    ).rejects.toThrow(/already_awarded/);
  });
  it("prevents fallback collection after normal reward too", async () => {
    await setLessons({ "lesson-1": completedLesson(1) });
    await asUser(C, "select public.award('lesson','lesson-1',30)");
    await setLessons({ "lesson-1": completedLesson(1, "lesson_fallback") });
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
    ).rejects.toThrow(/already_awarded/);
  });
  it("rejects forged amount and mismatched completion source", async () => {
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',30)"),
    ).rejects.toThrow(/bad_request/);
    await expect(
      asUser(C, "select public.award('lesson','lesson-1',30)"),
    ).rejects.toThrow(/bad_request/);
  });
  it("checks real video evidence, not a prefilled stage flag", async () => {
    const lesson = completedLesson(1, "lesson_fallback");
    lesson.video = { confirmed: false };
    await setLessons({ "lesson-1": lesson });
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
    ).rejects.toThrow(/bad_request/);
    await setLessons({
      "lesson-1": { ...lesson, video: { watchedRatio: 0.79 } },
    });
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
    ).rejects.toThrow(/bad_request/);
    await setLessons({
      "lesson-1": { ...lesson, video: { watchedRatio: 0.8 } },
    });
    await asUser(C, "select public.award('lesson_fallback','lesson-1',15)");
  });
  it("scores actual quiz answers at 70 percent and disregards claimed score", async () => {
    const lesson = completedLesson(1, "lesson_fallback");
    lesson.quiz.answers.q5 = 0;
    lesson.quiz.answers.q6 = 0;
    await setLessons({
      "lesson-1": { ...lesson, quiz: { ...lesson.quiz, lastScore: 100 } },
    });
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
    ).rejects.toThrow(/bad_request/);
    lesson.quiz.retryAnswers = { q5: 1 };
    await setLessons({ "lesson-1": lesson });
    await asUser(C, "select public.award('lesson_fallback','lesson-1',15)");
  });
  it.each(["circuit", "code", "run"] as const)(
    "requires practice evidence: %s",
    async (step) => {
      const lesson = completedLesson(1, "lesson_fallback");
      lesson.practice[step] = false;
      await setLessons({ "lesson-1": lesson });
      await expect(
        asUser(C, "select public.award('lesson_fallback','lesson-1',15)"),
      ).rejects.toThrow(/bad_request/);
    },
  );
  it("requires preceding lessons before awarding later ones", async () => {
    await setLessons({ "lesson-2": completedLesson(2, "lesson_fallback") });
    await expect(
      asUser(C, "select public.award('lesson_fallback','lesson-2',15)"),
    ).rejects.toThrow(/bad_request/);
  });
  it("resets bare legacy completions remotely while preserving balances and receipts", async () => {
    await setLessons({
      "lesson-1": {
        status: "done",
        stages: { video: true, test: true, practice: true },
      },
      "lesson-2": { status: "done" },
    });
    await db.exec(
      `update public.profiles set sparks=75,mentor_tokens=41 where id='${C}';insert into public.xp_events(user_id,amount,source,ref_id) values('${C}',30,'lesson','lesson-1')`,
    );
    const payload = {
      progressEvidenceVersion: 1,
      lessons: {
        "lesson-1": { status: "current" },
        "lesson-2": { status: "locked" },
      },
      sparks: 999,
      xp: 999,
      mentor: { tokens: 999 },
    };
    const saved = await asUser(
      C,
      `select public.save_progress('${JSON.stringify(payload)}') as result`,
    );
    expect(saved.rows[0].result).toMatchObject({
      sparks: 75,
      xp: 30,
      mentor: { tokens: 41 },
      lessons: {
        "lesson-1": {
          status: "current",
          rewarded: true,
          stages: { video: false, test: false, practice: false },
        },
        "lesson-2": { status: "locked" },
      },
    });
    await expect(
      asUser(C, "select public.award('lesson','lesson-1',30)"),
    ).rejects.toThrow(/already_awarded/);
  });
  it("normalizes claimed done without evidence and keeps exactly one current lesson", async () => {
    await setLessons({});
    const payload = {
      progressEvidenceVersion: 1,
      lessons: {
        "lesson-1": { status: "done" },
        "lesson-2": completedLesson(2),
      },
    };
    const saved = await asUser(
      C,
      `select public.save_progress('${JSON.stringify(payload)}') as result`,
    );
    const result = saved.rows[0].result as {
      lessons: Record<string, { status: string }>;
    };
    expect(result.lessons["lesson-1"].status).toBe("current");
    expect(result.lessons["lesson-2"].status).toBe("locked");
    expect(
      Object.values(result.lessons).filter(
        (lesson) => lesson.status === "current",
      ),
    ).toHaveLength(1);
  });
  it("preserves verified old completion across a stale evidence-aware device save", async () => {
    const payload = {
      progressEvidenceVersion: 1,
      lessons: {
        "lesson-1": { status: "current" },
        "lesson-2": completedLesson(2),
      },
    };
    const saved = await asUser(
      C,
      `select public.save_progress('${JSON.stringify(payload)}') as result`,
    );
    expect(saved.rows[0].result).toMatchObject({
      lessons: {
        "lesson-1": { status: "done", completionSource: "lesson_fallback" },
        "lesson-2": { status: "done" },
        "lesson-3": { status: "current" },
      },
    });
  });
});
