import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { courseCopy } from "@arduhub/curriculum/course.ru";
import { authConfigured, countDone, loginError, supabase } from "./auth";
import { site, t } from "./content";
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from "./prefs";
import { navigate, route, useLocation } from "./router";

const LearningArea = lazy(() => import("./learning/LearningArea"));

const total = courseCopy.length;
const open = (path: string) => void window.arduhub.openExternal(site + path);

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(
    authConfigured ? undefined : null,
  );
  const r = route(useLocation());
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  useEffect(() => applyPrefs(prefs), [prefs]);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    // Fires INITIAL_SESSION first (restored from the encrypted store), then
    // every sign-in, refresh and sign-out.
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return (
      <main className="center" aria-busy="true">
        <p className="muted">{t.loading}</p>
      </main>
    );
  if (!session) return <Login />;
  if (r.screen === "lessons" || r.screen === "lesson")
    return (
      <Suspense
        fallback={
          <main className="center" aria-busy="true">
            <p className="muted">{t.loading}</p>
          </main>
        }
      >
        <LearningArea lessonId={r.screen === "lesson" ? r.id : undefined} />
      </Suspense>
    );
  return r.screen === "settings" ? (
    <Settings
      session={session}
      prefs={prefs}
      onPrefs={(p) => {
        setPrefs(p);
        savePrefs(p);
      }}
      onBack={() => navigate("/menu")}
    />
  ) : (
    <Menu session={session} onSettings={() => navigate("/settings")} />
  );
}

function Logo() {
  return (
    <div className="logo" aria-label={t.brand}>
      Ardu<b>Hub</b>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    authConfigured ? null : t.login.config,
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return setError(t.login.config);
    if (!email.trim() || !password) return setError(t.login.empty);
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      setError(loginError(err));
    } catch {
      setError(t.login.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <section className="card login-card">
        <Logo />
        <span className="tag">{t.login.eyebrow}</span>
        <h1>{t.login.title}</h1>
        <p className="muted">{t.login.subtitle}</p>
        <form onSubmit={submit} noValidate>
          <label>
            {t.login.email}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className="label">
            <label htmlFor="login-password">{t.login.password}</label>
            <span className="field">
              <input
                id="login-password"
                type={shown ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="ghost"
                aria-label={shown ? t.login.hide : t.login.show}
                aria-pressed={shown}
                onClick={() => setShown(!shown)}
              >
                {shown ? "◉" : "◎"}
              </button>
            </span>
          </div>
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="btn"
            type="submit"
            disabled={busy || !authConfigured}
          >
            {busy ? t.login.busy : t.login.submit}
          </button>
        </form>
        <div className="links">
          <button
            type="button"
            className="link"
            onClick={() => open("/register")}
          >
            {t.login.register} ↗
          </button>
          <button
            type="button"
            className="link"
            onClick={() => open("/sign-in")}
          >
            {t.login.forgot} ↗
          </button>
        </div>
      </section>
    </main>
  );
}

function Menu({
  session,
  onSettings,
}: {
  session: Session;
  onSettings: () => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const id = session.user.id;
    void sb
      .from("profiles")
      .select("display_name")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? null));
    void sb
      .from("progress")
      .select("data")
      .eq("user_id", id)
      .maybeSingle()
      .then(({ data, error }) =>
        setDone(error ? null : countDone(data?.data, total)),
      );
  }, [session.user.id]);

  return (
    <div className="app">
      <header className="top">
        <Logo />
        <div className="spacer" />
        <span className="chip">
          {name ?? t.menu.fallbackName} · {t.menu.plan}
        </span>
        <button type="button" className="chip" onClick={onSettings}>
          ⚙ {t.menu.settings}
        </button>
      </header>
      <main className="menu">
        <section className="hero">
          <h1>
            {t.menu.greeting(name ?? t.menu.fallbackName)}
            <br />
            {t.menu.question}
          </h1>
          <p className="muted lead">{t.menu.intro}</p>
        </section>
        <section className="cards">
          <Tile
            mark="2D"
            title={t.menu.learning}
            hint={t.menu.learningHint}
            onClick={() => navigate("/app/lessons")}
            extra={
              <>
                <div className="bar" aria-hidden="true">
                  <i style={{ width: `${((done ?? 0) / total) * 100}%` }} />
                </div>
                <p className="small muted">
                  {done === null
                    ? t.menu.progressUnknown
                    : t.menu.progress(done, total)}
                </p>
              </>
            }
          />
          <Tile
            mark="3D"
            title={t.menu.practice}
            hint={t.menu.practiceHint}
            soon
            current
          />
          <Tile
            mark="☺"
            title={t.menu.profile}
            hint={t.menu.profileHint}
            onClick={() => open("/app/profile")}
          />
        </section>
      </main>
      <footer className="foot muted small">{t.mock}</footer>
    </div>
  );
}

function Tile(props: {
  mark: string;
  title: string;
  hint: string;
  soon?: boolean;
  current?: boolean;
  extra?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span
        className={`node ${props.current ? "current" : props.soon ? "" : "done"}`}
      >
        {props.mark}
      </span>
      <span className="tile-body">
        <span className="tile-title">
          <h2>{props.title}</h2>
          {props.soon && <span className="tag">{t.menu.soon}</span>}
        </span>
        <span className="muted">{props.hint}</span>
        {props.extra}
      </span>
    </>
  );
  return props.onClick ? (
    <button type="button" className="card tile" onClick={props.onClick}>
      {body}
    </button>
  ) : (
    <div className="card tile" aria-disabled="true">
      {body}
    </div>
  );
}

function Settings(props: {
  session: Session;
  prefs: Prefs;
  onPrefs: (p: Prefs) => void;
  onBack: () => void;
}) {
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [version, setVersion] = useState("");
  useEffect(() => {
    void window.arduhub.store.persistent().then(setPersistent);
    void window.arduhub.version().then(setVersion);
  }, []);
  const { prefs, onPrefs } = props;

  return (
    <div className="app">
      <header className="top">
        <Logo />
        <div className="spacer" />
        <button type="button" className="chip" onClick={props.onBack}>
          {t.settings.back}
        </button>
      </header>
      <main className="settings">
        <h1>{t.settings.title}</h1>
        <section className="card">
          <fieldset>
            <legend>{t.settings.text}</legend>
            <div className="seg">
              {t.settings.textSizes.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="text"
                    checked={String(prefs.textScale) === value}
                    onChange={() =>
                      onPrefs({
                        ...prefs,
                        textScale: Number(value) as Prefs["textScale"],
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="row">
            <input
              type="checkbox"
              checked={prefs.reduceMotion}
              onChange={(e) =>
                onPrefs({ ...prefs, reduceMotion: e.target.checked })
              }
            />
            {t.settings.motion}
          </label>
        </section>
        <section className="card">
          <h2>{t.settings.account}</h2>
          <dl>
            <dt>{t.settings.email}</dt>
            <dd>{props.session.user.email}</dd>
            <dt>{t.settings.session}</dt>
            <dd>
              {persistent === null
                ? t.loading
                : persistent
                  ? t.settings.sessionSafe
                  : t.settings.sessionMemory}
            </dd>
            <dt>{t.settings.version}</dt>
            <dd>{version}</dd>
          </dl>
          <div className="links">
            <button
              type="button"
              className="btn danger"
              onClick={() => void supabase()?.auth.signOut()}
            >
              {t.settings.signOut}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => open("/privacy")}
            >
              {t.settings.privacy} ↗
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
