import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { askMentor } from "@/services/mentor/client";
import type { MentorRequest } from "@/components/mentor/openMentor";
import Boxicon from "@/components/icons/Boxicon";
import { mentorRigs, type MentorId } from "../mentor/mentors";
import { playSfx, playVoice } from "../sound/sfx";
import {
  FATAL,
  circuitErrors,
  hintFor,
  liveDanger,
  parseScene,
  signature,
  type FatalCode,
  type LessonContext,
} from "./brain";
import { petT as t } from "./content";
import {
  addChat,
  frequentMistake,
  loadMemory,
  recordMistake,
  saveMemory,
  type PetMemory,
} from "./memory";
import { silence, speak } from "./speech";
import { bubbleSide, chatBox, type ChatBox } from "./drag";
import { usePetPosition } from "./usePetPosition";
import volt from "./sprites/volt.png";
import oma from "./sprites/oma.png";
import rezik from "./sprites/rezik.png";
import shina from "./sprites/shina.png";
import { errorCopy } from "@arduhub/arduino-core/checker/errors.ru";
import "./pet.css";

const sprites: Record<MentorId, string> = { volt, oma, rezik, shina };
let greetedThisRun = false;

type Mood = "idle" | "talk" | "alert";

// A pixel companion that lives in the learning area: remembers mistakes,
// hints with growing detail, stops dangerous wiring out loud, and chats.
export default function PetCompanion(props: {
  userId: string;
  mentor: MentorId;
  name: string;
}) {
  const { mentor, userId } = props;
  const rig = mentorRigs[mentor];
  const [memory, setMemory] = useState<PetMemory>(() => loadMemory(userId));
  const [bubble, setBubble] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [fatal, setFatal] = useState<FatalCode | null>(null);
  const [chat, setChat] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const { pos, dragging, handlers, consumeClick } = usePetPosition();
  const viewport = { w: window.innerWidth, h: window.innerHeight };
  const side = bubbleSide(pos, viewport);
  const context = useRef<LessonContext>({});
  const acked = useRef(new Set<string>());
  const lastErrors = useRef("");
  const hideTimer = useRef(0);

  const remember = useCallback(
    (next: PetMemory) => {
      setMemory(next);
      saveMemory(userId, next);
    },
    [userId],
  );

  const say = useCallback(
    (text: string, voice = true) => {
      setBubble(text);
      setMood("talk");
      if (!voice || !speak(text, mentor)) playVoice(mentor);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(
        () => {
          setBubble(null);
          setMood("idle");
        },
        Math.min(14000, 3500 + text.length * 55),
      );
    },
    [mentor],
  );

  const stop = useCallback(
    (code: FatalCode) => {
      setFatal(code);
      setMood("alert");
      setBubble(null);
      playSfx("deny");
      speak(
        `${t.stop} ${t.fatal[code].title}. ${t.fatal[code].why}`,
        mentor,
        true,
      );
    },
    [mentor],
  );

  // First appearance in this run: greet, recalling a frequent mistake.
  useEffect(() => {
    if (greetedThisRun) return;
    greetedThisRun = true;
    const known = frequentMistake(loadMemory(userId));
    const text = known
      ? t.remember(
          props.name,
          errorCopy[known.code]?.[0] ?? known.code,
          known.count,
        )
      : t.greeting(props.name);
    const timer = window.setTimeout(() => say(text, false), 900);
    return () => window.clearTimeout(timer);
  }, [props.name, say, userId]);

  // Watch the lesson: live danger while wiring, hints after each check.
  useEffect(() => {
    function onContext(event: Event) {
      const detail = (event as CustomEvent<LessonContext>).detail ?? {};
      context.current = detail;
      const scene = parseScene(detail.context?.scene);
      const danger = liveDanger(scene);
      if (!danger) acked.current.delete("live:short_circuit");
      else if (!acked.current.has("live:short_circuit")) {
        acked.current.add("live:short_circuit");
        const [next] = recordMistake(
          loadMemory(userId),
          danger,
          detail.lessonId,
        );
        remember(next);
        stop(danger);
        return;
      }

      const sig = signature(detail.context?.errors);
      if (sig === lastErrors.current) return;
      const had = lastErrors.current;
      lastErrors.current = sig;
      if (!sig) {
        if (had) say(t.fixed);
        return;
      }
      const [first] = circuitErrors(scene, detail.lessonId);
      if (!first) {
        say(t.codeError(detail.context?.errors?.[0] ?? ""));
        return;
      }
      const [next, count] = recordMistake(
        loadMemory(userId),
        first.code,
        detail.lessonId,
      );
      remember(next);
      if (FATAL.has(first.code) && !acked.current.has(`check:${sig}`)) {
        acked.current.add(`check:${sig}`);
        stop(first.code as FatalCode);
      } else say(hintFor(first, count));
    }
    function onOpen(event: Event) {
      const request = (event as CustomEvent<MentorRequest>).detail ?? {};
      setChat(true);
      playSfx("mentor_open");
      if (request.prompt) setPending(request.prompt);
    }
    window.addEventListener("arduhub:mentor-context", onContext);
    window.addEventListener("arduhub:mentor-open", onOpen);
    return () => {
      window.removeEventListener("arduhub:mentor-context", onContext);
      window.removeEventListener("arduhub:mentor-open", onOpen);
    };
  }, [remember, say, stop, userId]);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      silence();
    },
    [],
  );

  return (
    <>
      <div
        className={`pet pet-mood-${mood} pet-bubble-${side.horizontal} pet-bubble-${side.vertical}${dragging ? " is-dragging" : ""}`}
        data-mentor={mentor}
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      >
        {bubble && !chat && !dragging && (
          <div className="pet-bubble" role="status">
            <span className="pet-name">{rig.name}</span>
            <p>{bubble}</p>
          </div>
        )}
        <button
          type="button"
          className="pet-sprite"
          aria-label={t.open(rig.name)}
          aria-expanded={chat}
          aria-describedby="pet-move-hint"
          {...handlers}
          onClick={() => {
            if (consumeClick()) return;
            playSfx("mentor_open");
            setChat((v) => !v);
          }}
        >
          <img
            src={sprites[mentor]}
            alt=""
            width={96}
            height={96}
            draggable={false}
          />
        </button>
        <span id="pet-move-hint" className="sr-only">
          {t.moveHint}
        </span>
      </div>

      {chat && (
        <PetChat
          mentor={mentor}
          memory={memory}
          remember={remember}
          context={context}
          initial={pending}
          onInitialSent={() => setPending(null)}
          onClose={() => setChat(false)}
          box={chatBox(pos, viewport)}
        />
      )}

      {fatal && (
        <div className="pet-alert-backdrop">
          <div
            className="pet-alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pet-alert-title"
            aria-describedby="pet-alert-why"
          >
            <img src={sprites[mentor]} alt="" width={144} height={144} />
            <div>
              <span className="pet-name">{rig.name}</span>
              <h2 id="pet-alert-title">
                {t.stop} {t.fatal[fatal].title}
              </h2>
              <p id="pet-alert-why">{t.fatal[fatal].why}</p>
              <button
                type="button"
                className="btn"
                autoFocus
                onClick={() => {
                  silence();
                  setFatal(null);
                  setMood("idle");
                }}
              >
                {t.understood}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PetChat(props: {
  mentor: MentorId;
  memory: PetMemory;
  remember: (m: PetMemory) => void;
  context: React.RefObject<LessonContext>;
  initial: string | null;
  onInitialSent: () => void;
  onClose: () => void;
  box: ChatBox;
}) {
  const { mentor, memory, remember, context } = props;
  const rig = mentorRigs[mentor];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [template, setTemplate] = useState(false);
  const [failed, setFailed] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const mem = useRef(memory);
  useEffect(() => {
    mem.current = memory;
  }, [memory]);

  const send = useCallback(
    async (message: string) => {
      const question = message.trim();
      if (!question || busy) return;
      setBusy(true);
      setFailed(false);
      setDraft("");
      const withQuestion = addChat(mem.current, {
        role: "user",
        text: question,
      });
      remember(withQuestion);
      try {
        const reply = await askMentor(
          {
            mentorId: mentor,
            mode: "chat",
            message: question,
            history: withQuestion.chat.slice(-9, -1).map((l) => ({
              role: l.role === "user" ? "user" : "assistant",
              text: l.text,
            })),
            lessonId: context.current?.lessonId,
            context: context.current?.context,
          },
          // onDelta receives the text so far, not the increment.
          { onDelta: (soFar) => setDraft(soFar) },
        );
        setTemplate(reply.fallback);
        remember(addChat(withQuestion, { role: "mentor", text: reply.reply }));
        playVoice(mentor);
      } catch {
        setFailed(true);
      } finally {
        setDraft("");
        setBusy(false);
      }
    },
    [busy, context, mentor, remember],
  );

  // A question passed from "Спросить наставника" is sent right after opening.
  const { initial, onInitialSent } = props;
  useEffect(() => {
    if (!initial) return;
    const timer = window.setTimeout(() => {
      onInitialSent();
      void send(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial, onInitialSent, send]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [memory.chat.length, draft]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const message = text;
    setText("");
    void send(message);
  }

  return (
    <section
      className="pet-chat"
      aria-label={t.chat.title}
      style={{
        left: props.box.left,
        top: props.box.top,
        bottom: props.box.bottom,
        width: props.box.width,
        maxHeight: props.box.maxHeight,
      }}
    >
      <header>
        <img src={sprites[mentor]} alt="" width={48} height={48} />
        <div>
          <span className="pet-name">{rig.name}</span>
          <strong>{t.chat.title}</strong>
        </div>
        <button
          type="button"
          className="pet-close"
          aria-label={t.chat.close}
          onClick={props.onClose}
        >
          <Boxicon name="close" />
        </button>
      </header>
      <div className="pet-log" ref={log} role="log" aria-live="polite">
        {memory.chat.length === 0 && !busy && (
          <p className="pet-empty">{t.chat.empty}</p>
        )}
        {memory.chat.map((l, i) => (
          <p key={i} className={`pet-msg pet-${l.role}`}>
            {l.text}
          </p>
        ))}
        {busy && (
          <p className="pet-msg pet-mentor">{draft || t.chat.thinking}</p>
        )}
        {failed && <p className="pet-note">{t.chat.error}</p>}
        {template && !busy && <p className="pet-note">{t.chat.template}</p>}
      </div>
      <form onSubmit={submit}>
        <input
          aria-label={t.chat.placeholder}
          placeholder={t.chat.placeholder}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <button type="submit" className="btn" disabled={busy || !text.trim()}>
          <Boxicon name="next" />
          <span className="sr-only">{t.chat.send}</span>
        </button>
      </form>
    </section>
  );
}
