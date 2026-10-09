import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";

interface Source {
  title: string;
  url: string;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  sources?: Source[];
  search_source?: "tavily" | "ddgs" | null;
}

const SUGGESTIONS = [
  "Portföyümü analiz et, riskli mi?",
  "PGE fonu iyi bir yatırım mı?",
  "Şu an altın mı dolar mı, hangisi daha mantıklı?",
  "BIST 100 şu an ne durumda?",
  "Faiz düşerse hisse piyasasını nasıl etkiler?",
];

const LS_PORTFOLIO = "finansrehber.portfoy";

/* --- Tarayıcı konuşma tanıma (Web Speech API) — minimal tipler --- */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function getRecognition(): RecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "tr-TR";
  rec.continuous = false;
  rec.interimResults = true;
  return rec;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const clean = text
    .replace(/#+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .slice(0, 1200);
  const utter = new SpeechSynthesisUtterance(clean);
  const tr = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("tr"));
  if (tr) utter.voice = tr;
  utter.lang = "tr-TR";
  utter.rate = 1.05;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

/** Basit markdown: **kalın** + satır başı # işaretlerini düz metne çevirir. */
function renderMd(text: string) {
  const clean = text
    .split("\n")
    .map((line) => line.replace(/^#{1,4}\s+/, ""))
    .join("\n");
  return clean.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function AiPage() {
  const [searchParams] = useSearchParams();
  const contextParam = searchParams.get("context"); // ör: fund:PGE, stock:THYAO

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOut, setVoiceOut] = useState(true);
  const [includePortfolio, setIncludePortfolio] = useState(false);
  const [listening, setListening] = useState(false);

  const recRef = useRef<RecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceOutRef = useRef(voiceOut);
  voiceOutRef.current = voiceOut;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || busy) return;

      const portfolio = includePortfolio
        ? (() => {
            try {
              return JSON.parse(localStorage.getItem(LS_PORTFOLIO) || "[]");
            } catch {
              return [];
            }
          })()
        : null;

      const [ctype, cid] = (contextParam || "").split(":");
      const history = messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));

      setMessages((ms) => [...ms, { role: "user", text: question }]);
      setInput("");
      setBusy(true);
      setError(null);

      try {
        const { data } = await api.post("/ai/ask", {
          question,
          history,
          context_type: ctype || null,
          context_id: cid || null,
          portfolio,
        });
        setMessages((ms) => [
          ...ms,
          { role: "model", text: data.answer, sources: data.sources, search_source: data.search_source },
        ]);
        if (voiceOutRef.current) speak(data.answer);
      } catch (err) {
        const msg = apiErrorMessage(err);
        setError(msg);
        setMessages((ms) => [...ms, { role: "model", text: `Üzgünüm, yanıt alamadım: ${msg}` }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, contextParam, includePortfolio],
  );

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      setError("Tarayıcın konuşma tanımayı desteklemiyor — Chrome veya Edge kullan ya da yazarak sor.");
      return;
    }
    recRef.current = rec;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText + " " + interim).trim());
    };
    rec.onend = () => {
      setListening(false);
      const q = finalText.trim();
      if (q) send(q);
    };
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function stopSpeaking() {
    speechSynthesis.cancel();
  }

  const contextLabel =
    contextParam === null
      ? null
      : contextParam.startsWith("fund:")
        ? `📊 ${contextParam.split(":")[1]} fonu bağlamı aktif`
        : contextParam.startsWith("us_stock:")
          ? `📈 ${contextParam.split(":")[1]} (ABD) bağlamı aktif`
          : contextParam.startsWith("stock:")
            ? `📈 ${contextParam.split(":")[1]} bağlamı aktif`
            : contextParam;

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[560px] flex-col">
      {/* başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center bg-accent font-mono text-lg font-extrabold text-white">
            R
          </span>
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-ink">
              Rehber <span className="text-accent">AI</span>
            </h1>
            <p className="text-xs text-muted">Kişisel finans danışmanın · sesli sor, sesli cevap al</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIncludePortfolio((v) => !v);
            }}
            className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
              includePortfolio
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            📁 Portföyüm dahil
          </button>
          <button
            onClick={() => {
              if (voiceOut) stopSpeaking();
              setVoiceOut((v) => !v);
            }}
            title={voiceOut ? "Sesli yanıtı kapat" : "Sesli yanıtı aç"}
            className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
              voiceOut
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            {voiceOut ? "🔊 Sesli yanıt" : "🔇 Sessiz"}
          </button>
        </div>
      </div>

      {/* bağlam bilgisi */}
      {contextLabel && (
        <p className="mt-3 border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent">
          {contextLabel} — soruların bu varlığa özel yanıtlanacak.
        </p>
      )}

      {/* mesajlar */}
      <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-14 w-14 items-center justify-center bg-accent font-mono text-2xl font-extrabold text-white">
              R
            </span>
            <p className="mt-4 max-w-md text-sm text-muted">
              Merhaba, ben <span className="font-semibold text-ink">Rehber AI</span>. Finans
              danışmanınım — fonlardan portföyüne kadar her şeyi sorabilirsin. 🎤 ile sesli
              sorabilirsin, ben de sesli cevap veririm.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="border border-line bg-panel px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] border px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "border-accent/40 bg-accent/10 text-ink"
                  : "border-line bg-panel text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{renderMd(m.text)}</p>
              {m.role === "model" && m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                    Kaynaklar
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {m.sources.slice(0, 6).map((s, j) => (
                      <li key={j}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent no-underline hover:underline"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {m.role === "model" && (m.search_source === "tavily" || m.search_source === "ddgs") && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-up">
                  🌐 {m.search_source === "tavily" ? "Tavily" : "DuckDuckGo"} web aramasıyla desteklendi — kaynaklar aşağıda
                </p>
              )}
              {m.role === "model" && m.search_source === null && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                  🌐 web araması kullanılamadı — cevap bağlam verileriyle sınırlı olabilir
                </p>
              )}
              {m.role === "model" && (
                <button
                  onClick={() => speak(m.text)}
                  title="Sesli oku"
                  className="mt-2 font-mono text-[10px] uppercase tracking-widest text-faint hover:text-accent"
                >
                  🔊 sesli oku
                </button>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="border border-line bg-panel px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce bg-accent" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce bg-accent" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce bg-accent" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="ml-2 font-mono text-xs text-faint">Rehber AI düşünüyor…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 border border-down/50 bg-down/10 px-3 py-2 font-mono text-xs text-down">
          {error}
        </p>
      )}

      {/* girdi alanı */}
      <div className="mt-3 flex items-end gap-2 border-t border-line pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder={
            listening ? "Dinliyorum, konuşabilirsin…" : "Sorunu yaz ya da 🎤 ile sesli sor…"
          }
          className="grow resize-none border border-line bg-panel px-3 py-2.5 font-sans text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <button
          onClick={toggleMic}
          title="Sesli sor"
          className={`h-11 w-11 border font-mono text-lg ${
            listening
              ? "animate-pulse border-accent bg-accent text-white"
              : "border-line bg-panel text-muted hover:border-accent hover:text-accent"
          }`}
        >
          🎤
        </button>
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="h-11 border border-accent bg-accent px-5 font-mono text-xs font-bold uppercase tracking-widest text-white enabled:hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gönder
        </button>
      </div>

      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
        Rehber AI yatırım tavsiyesi vermez; yanıtlar yapay zeka üretimidir ve hatalı olabilir.
      </p>
    </div>
  );
}
