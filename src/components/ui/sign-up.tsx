"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { authRu as c } from "@/content/dashboard.ru";
import { authSignupRu as s } from "@/content/ru";
import { TextureButton } from "@/components/ui/texture-button";

export interface SignupValues {
  email: string;
  password: string;
  repeat: string;
  name: string;
  role: "student" | "teacher";
  consent: boolean;
}

interface AuthComponentProps {
  mode?: "login" | "register";
  values: SignupValues;
  onChange: (patch: Partial<SignupValues>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn: () => void;
  onForgot?: () => void;
  onResend?: () => void;
  cooldown?: boolean;
  onGuest: () => void;
  busy: boolean;
  error: string;
  message: string;
  logo: ReactNode;
  brandName: string;
}

function FieldIcon({ kind }: { kind: "mail" | "lock" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      {kind === "mail" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : (
        <>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
    </svg>
  );
}

/** Adapted from the supplied glass sign-up: real account state replaces demo timers. */
export function AuthComponent({
  mode = "register",
  values: v,
  onChange,
  onSubmit,
  onSignIn,
  onForgot,
  onResend,
  cooldown,
  onGuest,
  busy,
  error,
  message,
  logo,
  brandName,
}: AuthComponentProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState("");
  const focusField = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const login = mode === "login";
  const finalStep = login || step === 2;
  const title = login
    ? s.loginStart
    : [s.start, s.passwordTitle, s.finish][step];
  function next(event: FormEvent<HTMLFormElement>) {
    if (finalStep) {
      setLocalError("");
      onSubmit(event);
      return;
    }
    event.preventDefault();
    if (step === 1 && v.password.length < 8) {
      setLocalError(c.short);
      return;
    }
    setLocalError("");
    setStep(step === 0 ? 1 : 2);
  }
  function back() {
    setStep(step === 2 ? 1 : 0);
    setLocalError("");
  }
  return (
    <section
      className="auth-card auth-signup"
      aria-labelledby="signup-title"
      aria-busy={busy}
    >
      <Link className="auth-brand signup-brand" href="/" prefetch={false}>
        {logo}
        <span>{brandName}</span>
      </Link>
      <h1 id="signup-title">{title}</h1>
      <motion.div
        className="signup-scroll"
        ref={scrollArea}
        key={step}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onAnimationComplete={() => {
          if (scrollArea.current) scrollArea.current.scrollTop = 0;
          if (step > 0) focusField.current?.focus({ preventScroll: true });
        }}
      >
        <form className="signup-form" onSubmit={next}>
          <fieldset disabled={busy}>
            {step > 0 && <p className="signup-email">{v.email}</p>}
            <label className="signup-label" htmlFor="signup-main">
              {step === 0 ? c.email : step === 1 ? c.password : c.repeat}
            </label>
            <div className="signup-glass-input">
              <span className="signup-field-icon">
                <FieldIcon kind={step === 0 ? "mail" : "lock"} />
              </span>
              <input
                key={step}
                ref={focusField}
                id="signup-main"
                type={step === 0 ? "email" : show ? "text" : "password"}
                autoComplete={
                  step === 0
                    ? "email"
                    : login
                      ? "current-password"
                      : "new-password"
                }
                value={
                  step === 0 ? v.email : step === 1 ? v.password : v.repeat
                }
                onChange={(event) => {
                  setLocalError("");
                  onChange(
                    step === 0
                      ? { email: event.target.value }
                      : step === 1
                        ? { password: event.target.value }
                        : { repeat: event.target.value },
                  );
                }}
                placeholder={
                  step === 0 ? s.emailHint : step === 1 ? c.password : c.repeat
                }
                required
                aria-describedby={
                  localError || error
                    ? "auth-error"
                    : step === 1 && !login
                      ? "signup-password-hint"
                      : undefined
                }
              />
              {step > 0 && (
                <TextureButton
                  variant="icon"
                  size="icon"
                  className="signup-eye"
                  type="button"
                  aria-label={show ? c.hide : c.show}
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  {show ? "◉" : "◎"}
                </TextureButton>
              )}
              {!finalStep && (
                <TextureButton
                  variant="primary"
                  size="icon"
                  className="signup-next"
                  aria-label={s.next}
                >
                  <span aria-hidden="true">→</span>
                </TextureButton>
              )}
            </div>
            {login && (
              <>
                <label className="signup-label" htmlFor="login-password">
                  {c.password}
                </label>
                <div className="signup-glass-input">
                  <span className="signup-field-icon">
                    <FieldIcon kind="lock" />
                  </span>
                  <input
                    id="login-password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={v.password}
                    onChange={(event) =>
                      onChange({ password: event.target.value })
                    }
                    placeholder={c.password}
                    required
                    aria-describedby={error ? "auth-error" : undefined}
                  />
                  <TextureButton
                    variant="icon"
                    size="icon"
                    className="signup-eye"
                    type="button"
                    aria-label={show ? c.hide : c.show}
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? "◉" : "◎"}
                  </TextureButton>
                </div>
              </>
            )}
            {step === 1 && !login && (
              <p id="signup-password-hint" className="auth-caption">
                {c.short}
              </p>
            )}
            {step === 2 && !login && (
              <div className="signup-details">
                <label>
                  {c.name}
                  <input
                    autoComplete="nickname"
                    maxLength={20}
                    required
                    value={v.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder={c.nameHint}
                  />
                </label>
                <fieldset className="auth-roles">
                  <legend className="sr-only">{s.role}</legend>
                  {(["student", "teacher"] as const).map((role) => (
                    <label
                      key={role}
                      className={v.role === role ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={v.role === role}
                        onChange={() => onChange({ role })}
                      />
                      <strong>{c[role]}</strong>
                    </label>
                  ))}
                </fieldset>
                <label className="auth-consent">
                  <input
                    type="checkbox"
                    checked={v.consent}
                    onChange={(e) => onChange({ consent: e.target.checked })}
                  />
                  <Link href="/privacy" prefetch={false}>
                    {c.agree}
                  </Link>
                </label>
                <p className="auth-caption">{c.parent}</p>
                <TextureButton
                  variant="primary"
                  className="signup-submit"
                  disabled={busy}
                >
                  {busy
                    ? c.pending
                    : v.role === "student"
                      ? c.registerStudent
                      : c.registerTeacher}
                  <span aria-hidden="true">→</span>
                </TextureButton>
              </div>
            )}
            {login && finalStep && (
              <TextureButton
                variant="primary"
                className="signup-submit"
                disabled={busy}
              >
                {busy ? c.pending : c.login}
                <span aria-hidden="true">→</span>
              </TextureButton>
            )}
            {(localError || error) && (
              <p id="auth-error" className="auth-error" role="alert">
                {localError || error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            {login && error === c.confirm && (
              <TextureButton
                variant="secondary"
                size="sm"
                type="button"
                disabled={cooldown}
                onClick={onResend}
              >
                {c.resend}
              </TextureButton>
            )}
          </fieldset>
        </form>
        <div className="signup-navigation">
          {step > 0 && (
            <TextureButton
              variant="minimal"
              size="sm"
              className="auth-link signup-back"
              disabled={busy}
              onClick={back}
            >
              <span aria-hidden="true">← </span>
              {s.back}
            </TextureButton>
          )}
          {login && (
            <TextureButton
              variant="minimal"
              size="sm"
              className="auth-link"
              disabled={busy}
              onClick={onForgot}
            >
              {c.forgot}
            </TextureButton>
          )}
        </div>
        <div className="signup-footer">
          <TextureButton
            variant="minimal"
            size="sm"
            className="auth-link"
            disabled={busy}
            onClick={onSignIn}
          >
            {login ? c.signUp : `${c.haveAccount} ${c.login}`}
          </TextureButton>
          <TextureButton
            variant="secondary"
            className="signup-guest"
            disabled={busy}
            onClick={onGuest}
          >
            {c.guest}
            <span aria-hidden="true"> ↗</span>
          </TextureButton>
        </div>
      </motion.div>
    </section>
  );
}
