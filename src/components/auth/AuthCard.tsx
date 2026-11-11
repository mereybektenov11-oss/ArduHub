"use client";
import Link from "next/link";
import AuthBackdrop from "./AuthBackdrop";
import AuthBrand from "./AuthBrand";
import { AuthComponent } from "@/components/ui/sign-up";
import { TextureButton } from "@/components/ui/texture-button";
import { ru } from "@/content/ru";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authRu as c } from "@/content/dashboard.ru";
import {
  authError,
  validateRegistration,
  normalizeAuthEmail,
  recoverySession,
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
  useEffect(() => {
    const session = recoverySession(location.hash);
    if (!session) return;
    // Fragments never reach the callback server. Consume them here and remove
    // credentials from browser history before loading the auth client.
    let cancelled = false;
    async function restore() {
      try {
        const { browserSupabase } = await import("@/lib/supabase/client");
        if (cancelled) return;
        history.replaceState(null, "", location.pathname + location.search);
        setBusy(true);
        const client = browserSupabase();
        if (!client) throw Error();
        const { error } = await client.auth.setSession(session!);
        if (error) throw error;
        if (!cancelled) {
          setMode("reset");
          setError("");
          setMessage("");
          history.replaceState(null, "", "/auth/reset");
        }
      } catch {
        if (!cancelled) {
          setMode("forgot");
          setError(c.expired);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);
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
    const { browserSupabase, passwordRecoveryClient } =
      await import("@/lib/supabase/client");
    const client =
      mode === "forgot" ? passwordRecoveryClient() : browserSupabase();
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
            emailRedirectTo: location.origin + "/auth/callback?next=profile",
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
          router.replace("/app/profile");
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
      data-auth-mode={mode}
      style={motionCssVars}
    >
      <AuthBackdrop />
      <header className="auth-header">
        <Link href="/" prefetch={false}>
          ← {c.home}
        </Link>
        <TextureButton
          variant="icon"
          size="icon"
          aria-label={c.theme}
          onClick={() => setDark(!dark)}
        >
          {dark ? "☀" : "☾"}
        </TextureButton>
      </header>
      {mode === "register" || mode === "login" ? (
        <AuthComponent
          key={mode}
          mode={mode}
          values={{ email, password, repeat, name, role, consent }}
          onChange={(patch) => {
            if (patch.email !== undefined) setEmail(patch.email);
            if (patch.password !== undefined) setPassword(patch.password);
            if (patch.repeat !== undefined) setRepeat(patch.repeat);
            if (patch.name !== undefined) setName(patch.name);
            if (patch.role !== undefined) setRole(patch.role);
            if (patch.consent !== undefined) setConsent(patch.consent);
            setError("");
          }}
          onSubmit={submit}
          onSignIn={() => changeMode(mode === "login" ? "register" : "login")}
          onForgot={() => changeMode("forgot")}
          onResend={resend}
          cooldown={cooldown}
          onGuest={guest}
          busy={busy}
          error={error}
          message={message}
          logo={<AuthBrand />}
          brandName={ru.brand}
        />
      ) : (
        <section className="auth-card" ref={card}>
          <Link className="auth-brand" href="/" prefetch={false}>
            <AuthBrand />
            {ru.brand}
          </Link>
          <h1>
            {mode === "forgot"
              ? c.reset
              : mode === "reset"
                ? c.newPassword
                : c.signIn}
          </h1>
          <form onSubmit={submit} className="auth-form">
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
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <TextureButton
                      variant="icon"
                      size="icon"
                      type="button"
                      aria-label={show ? c.hide : c.show}
                      aria-pressed={show}
                      onClick={() => setShow(!show)}
                    >
                      {show ? "◉" : "◎"}
                    </TextureButton>
                  </span>
                </label>
                {mode === "reset" && (
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
            {error && (
              <p id="auth-error" role="alert" className="auth-error">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            <TextureButton
              variant="primary"
              className="auth-primary"
              disabled={busy}
            >
              {busy
                ? c.pending
                : mode === "forgot"
                  ? c.resetButton
                  : mode === "reset"
                    ? c.setPassword
                    : role === "student"
                      ? c.registerStudent
                      : c.registerTeacher}
            </TextureButton>
            {error === c.confirm && (
              <TextureButton
                variant="secondary"
                size="sm"
                type="button"
                disabled={cooldown}
                onClick={resend}
              >
                {c.resend}
              </TextureButton>
            )}
          </form>
          {(mode === "forgot" || mode === "reset") && (
            <TextureButton
              variant="minimal"
              size="sm"
              className="auth-link"
              onClick={() => changeMode("login")}
            >
              {c.login}
            </TextureButton>
          )}
          <TextureButton
            variant="secondary"
            className="auth-guest"
            disabled={busy}
            onClick={guest}
          >
            {c.guest} →
          </TextureButton>
        </section>
      )}
    </main>
  );
}
