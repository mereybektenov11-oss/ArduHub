"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ru } from "@/content/ru";
import { normalizeEmail, type Role } from "@/lib/validators";
import { submitWaitlist } from "@/lib/submitWaitlist";
const subscribe = () => () => {};
export default function WaitlistForm({ configured }: { configured: boolean }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("other");
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const busy = useRef(false);
  const trap = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function update(e: Event) {
      const selected = (e as CustomEvent).detail;
      setRole(selected === "school" ? "school" : "other");
    }
    window.addEventListener("arduhub:role", update);
    return () => window.removeEventListener("arduhub:role", update);
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setState("error");
      setError(ru.ui.invalid);
      return;
    }
    busy.current = true;
    setState("sending");
    setError("");
    try {
      const result = await submitWaitlist({
        email: normalized,
        website: trap.current?.value ?? "",
        role,
      });
      if (result === "success") {
        setState("success");
      } else {
        setState("error");
        setError(result === "rate_limited" ? ru.ui.limited : ru.ui.unavailable);
      }
    } catch {
      setState("error");
      setError(ru.ui.network);
    } finally {
      busy.current = false;
    }
  }
  return (
    <div className="waitlist">
      <div aria-live="polite" role="status">
        {state === "success" && (
          <div className="form-success">
            <span aria-hidden="true">✓</span>
            <h3>{ru.ui.success}</h3>
          </div>
        )}
      </div>
      {state !== "success" && (
        <form noValidate onSubmit={submit}>
          <label htmlFor="waitlist-email">{ru.ui.email}</label>
          <div className="form-row">
            <input
              id="waitlist-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={ru.ui.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "waitlist-error" : "form-notice"}
              required
              maxLength={254}
            />
            <input
              className="honeypot"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              ref={trap}
            />
            <button
              className="button button-primary button-lg"
              type="submit"
              disabled={!hydrated || state === "sending"}
            >
              {state === "sending"
                ? ru.ui.sending
                : state === "error" && error !== ru.ui.invalid
                  ? ru.ui.retry
                  : ru.ui.submit}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          {role === "school" && (
            <p className="school-role">{ru.ui.schoolRole}</p>
          )}
          {error && (
            <p className="form-error" role="alert" id="waitlist-error">
              {error}
            </p>
          )}
          {!configured && (
            <p className="form-notice" id="form-notice">
              {ru.ui.unavailable}
            </p>
          )}
          <p className="consent">
            {ru.ui.consent} <a href="/privacy">{ru.ui.privacyLink}</a>.
          </p>
          {!hydrated && <p className="form-notice">{ru.ui.noJs}</p>}
        </form>
      )}
    </div>
  );
}
