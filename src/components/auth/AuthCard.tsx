"use client";
import Link from "next/link";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authRu as c } from "@/content/dashboard.ru";
import {
  authError,
  validateRegistration,
  normalizeAuthEmail,
} from "@/domain/auth";
import { motionTokens, motionCssVars } from "@/lib/motion";
type Mode = "login" | "register" | "forgot" | "reset";
export default function AuthCard({
  initialMode = "login",
  initialExpired = false,
}: {
  initialMode?: Mode;
  initialExpired?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode),
    [dark, setDark] = useState(false),
    [role, setRole] = useState<"student" | "teacher">("student"),
    [error, setError] = useState(initialExpired ? c.expired : ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [name, setName] = useState(""),
    [consent, setConsent] = useState(false),
    [show, setShow] = useState(false),
    [cooldown, setCooldown] = useState(false);
  const card = useRef<HTMLElement>(null);
  function changeMode(next: Mode) {
    const height = card.current?.offsetHeight;
    requestAnimationFrame(() => {
      if (
        height &&
        card.current &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        card.current.animate(
          [
            { height: height + "px" },
            { height: card.current.offsetHeight + "px" },
          ],
          {
            duration: motionTokens.duration.dialog * 1000,
            easing: "cubic-bezier(.22,1,.36,1)",
          },
        );
    });
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setRepeat("");
  }
  async function guest() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      if (!response.ok) throw Error();
      router.push("/app");
      router.refresh();
    } catch {
      setError(c.network);
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (mode === "register") {
      const invalid = validateRegistration({ name, password, repeat, consent });
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (mode === "reset" && (password.length < 8 || password !== repeat)) {
      setError(password.length < 8 ? c.short : c.mismatch);
      return;
    }
    const { browserSupabase } = await import("@/lib/supabase/client");
    const client = browserSupabase();
    if (!client) {
      setError(c.unavailable);
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(
          normalizeAuthEmail(email),
          {
            redirectTo: location.origin + "/auth/callback?next=reset",
          },
        );
        if (error?.name === "AuthRetryableFetchError") setError(c.network);
        else if (error) setError(c.mailUnavailable);
        else setMessage(c.resetMail);
      } else if (mode === "reset") {
        const { error } = await client.auth.updateUser({ password });
        if (error) {
          if (error.name === "AuthRetryableFetchError") {
            setPassword("");
            setRepeat("");
            setError(c.network);
          } else setError(c.expired);
        } else {
          router.push("/app");
          router.refresh();
        }
      } else if (mode === "register") {
        const { data, error } = await client.auth.signUp({
          email: normalizeAuthEmail(email),
          password,
          options: {
            data: {
              display_name: name.trim(),
              role,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            emailRedirectTo: location.origin + "/auth/callback",
          },
        });
        if (error) {
          if (error.name === "AuthRetryableFetchError") {
            setPassword("");
            setRepeat("");
            setError(c.network);
          } else if (error.code === "user_already_exists") {
            setMode("login");
            setRepeat("");
            setError(c.alreadyRegistered);
          } else if (
            error.code === "email_address_not_authorized" ||
            error.code === "email_address_not_allowed"
          )
            setError(c.emailDelivery);
          else if (
            error.code === "over_email_send_rate_limit" ||
            error.code === "over_request_rate_limit"
          )
            setError(c.rate);
          else setError(c.registrationFailed);
        } else if (data.session) {
          router.push("/app");
          router.refresh();
        } else setMessage(c.checkMail);
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: normalizeAuthEmail(email),
          password,
        });
        if (error) {
          if (error.name === "AuthRetryableFetchError") {
            setPassword("");
            setError(c.network);
          } else setError(authError(error.code));
        } else {
          router.push("/app");
          router.refresh();
        }
      }
    } catch {
      setPassword("");
      setRepeat("");
      setError(c.network);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (cooldown) return;
    const { browserSupabase } = await import("@/lib/supabase/client");
    const client = browserSupabase();
    if (!client) return;
    setCooldown(true);
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: normalizeAuthEmail(email),
      });
      if (error) setError(c.mailUnavailable);
      else setMessage(c.checkMail);
    } catch {
      setError(c.network);
    }
    setTimeout(() => setCooldown(false), 60000);
  }
  return (
    <main
      className={`auth-page ${dark ? "auth-dark" : ""}`}
      style={motionCssVars}
    >
      <header className="auth-header">
        <Link href="/" prefetch={false}>
          ← {c.home}
        </Link>
        <button aria-label={c.theme} onClick={() => setDark(!dark)}>
          {dark ? "☀" : "☾"}
        </button>
      </header>
      <section className="auth-card" ref={card}>
        <Link className="auth-brand" href="/" prefetch={false}>
          ∞ ArduHub<span>.</span>
        </Link>
        <h1>
          {mode === "forgot"
            ? c.reset
            : mode === "reset"
              ? c.newPassword
              : c.welcome}
        </h1>
        <p className="auth-subtitle">
          {mode === "register" ? c.instantRegistration : c.subtitle}
        </p>
        {(mode === "login" || mode === "register") && (
          <div className="auth-tabs" role="group" aria-label={c.signIn}>
            <button
              aria-pressed={mode === "login"}
              onClick={() => changeMode("login")}
            >
              {c.signIn}
            </button>
            <button
              aria-pressed={mode === "register"}
              onClick={() => changeMode("register")}
            >
              {c.signUp}
            </button>
          </div>
        )}
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <>
              <fieldset className="auth-roles">
                <legend>{c.signUp}</legend>
                {(["student", "teacher"] as const).map((r) => (
                  <label key={r} className={role === r ? "selected" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    <strong>{c[r]}</strong>
                    <small>
                      {r === "student" ? c.studentNote : c.teacherNote}
                    </small>
                  </label>
                ))}
              </fieldset>
              <label>
                {c.name}
                <input
                  autoComplete="nickname"
                  maxLength={20}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={c.nameHint}
                />
              </label>
            </>
          )}
          {mode !== "reset" && (
            <label>
              {c.email}
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {mode !== "forgot" && (
            <>
              <label>
                {c.password}
                <span className="auth-password">
                  <input
                    aria-label={c.password}
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={show ? c.hide : c.show}
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? "◉" : "◎"}
                  </button>
                </span>
              </label>
              {(mode === "register" || mode === "reset") && (
                <label>
                  {c.repeat}
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={repeat}
                    required
                    aria-describedby={error ? "auth-error" : undefined}
                    onChange={(e) => setRepeat(e.target.value)}
                  />
                </label>
              )}
            </>
          )}
          {mode === "register" && (
            <>
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  {c.agree} ·{" "}
                  <Link href="/privacy" prefetch={false}>
                    {c.policy}
                  </Link>
                </span>
              </label>
              <p className="auth-caption">{c.parent}</p>
            </>
          )}
          {error && (
            <p id="auth-error" role="alert" className="auth-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <button className="auth-primary" disabled={busy}>
            {busy
              ? c.pending
              : mode === "login"
                ? c.login
                : mode === "forgot"
                  ? c.resetButton
                  : mode === "reset"
                    ? c.setPassword
                    : role === "student"
                      ? c.registerStudent
                      : c.registerTeacher}
          </button>
          {error === c.confirm && (
            <button type="button" disabled={cooldown} onClick={resend}>
              {c.resend}
            </button>
          )}
        </form>
        {mode === "login" && (
          <button className="auth-link" onClick={() => changeMode("forgot")}>
            {c.forgot}
          </button>
        )}
        {(mode === "login" || mode === "register") && (
          <>
            <p className="auth-caption">
              {mode === "login" ? c.needAccount : c.haveAccount}{" "}
              <button
                className="auth-link"
                onClick={() =>
                  changeMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? c.signUp : c.login}
              </button>
            </p>
          </>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button className="auth-link" onClick={() => changeMode("login")}>
            {c.login}
          </button>
        )}
        <button className="auth-guest" disabled={busy} onClick={guest}>
          {c.guest} →
        </button>
      </section>
    </main>
  );
}
