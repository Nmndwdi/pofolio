"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LayoutData } from "@/components/layouts/types";
import { MatrixRain } from "./MatrixRain";
import { ScrollSection } from "./ScrollSection";
import { asciiBanner, bannerWouldOverflow } from "./ascii";
import {
  formatCodeforces,
  formatDevto,
  formatEducation,
  formatExperience,
  formatFiles,
  formatGithub,
  formatHelp,
  formatHuggingface,
  formatLeetcode,
  formatLinks,
  formatProjectDetail,
  formatProjects,
  formatSkills,
  formatSocials,
  formatWhoami,
} from "./output";
import styles from "./terminal.module.css";

/*
 * Terminal — the interactive heart of this template.
 *
 * Architecture:
 *   - `history` is the rendered scrollback: each item is either a user-typed
 *     command echo, or a system-rendered output. Each ReactNode lives in
 *     state, not strings — so we can render clickable links, chips, etc.
 *   - `input` is the current line being typed. Submit pushes it into
 *     `commandHistory` (separate from rendered history — used by ↑/↓).
 *   - Theme + matrix + mode are top-level UI state that the CLI commands
 *     can mutate (theme green, matrix on, mode scroll).
 *
 * Why useState + array, not useReducer:
 *   - Reducers shine when state transitions are complex enough that a
 *     centralized switch reads better than inline setters. Terminal state is
 *     simple (push to history, swap theme, toggle matrix); reducer here
 *     would be ceremony.
 *
 * Focus management:
 *   - Clicking anywhere on the page focuses the input. Standard terminal UX
 *     means the user shouldn't have to aim at the prompt.
 *   - Input is auto-focused on mount AFTER the boot sequence completes (we
 *     don't want the keyboard to pop up on mobile during the boot animation).
 */

type Theme = "green" | "amber" | "blue";
type Mode = "cli" | "scroll";

interface HistoryItem {
  id: string;
  /** The echoed prompt line (if any) — `naman@pofolio:~$ projects 2` */
  echo?: string;
  /** The rendered output node */
  output: ReactNode;
}

export function Terminal({ data }: { data: LayoutData }) {
  // ─── Boot sequence + post-boot intro ────────────────────────────────
  const [booted, setBooted] = useState(false);

  // ─── UI state ───────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>("green");
  const [matrix, setMatrix] = useState(false);
  const [mode, setMode] = useState<Mode>("cli");

  // ─── Input + history ────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState("");
  // commandHistory is the list of strings the user has run — separate from
  // the rendered history so ↑/↓ navigation only sees commands.
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Stable username for the prompt — slug if available, else lowercase first
  // word of the display name. `naman@pofolio:~$ ` reads as a real shell.
  const username = useMemo(() => {
    const slug = data.slug;
    if (slug) return slug.toLowerCase();
    const first = data.displayName.toLowerCase().split(/\s+/)[0];
    return first.replace(/[^a-z0-9_-]/g, "") || "user";
  }, [data.slug, data.displayName]);
  const promptStr = `${username}@pofolio:~$`;

  // ─── Boot: type the welcome lines, then show intro ────────────────
  // We schedule a 700ms "boot" delay then mark booted=true. During boot the
  // prompt doesn't accept input — feels like the system is loading.
  useEffect(() => {
    const t = setTimeout(() => {
      setBooted(true);
      // Seed initial output: a welcome line + a help hint.
      setHistory([
        {
          id: "boot",
          output: (
            <div className={styles.output}>
              <span className={styles.dim}>
                Welcome to Pofolio. Type{" "}
                <span className={styles.accent}>help</span> to see commands,
                or{" "}
                <span className={styles.accent}>mode scroll</span> for a
                non-CLI view.
              </span>
            </div>
          ),
        },
      ]);
      // Focus input now that boot is done.
      requestAnimationFrame(() => inputRef.current?.focus());
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // ─── Auto-scroll to bottom on every new history entry ──────────────
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // submitRef lets nested rendered output (e.g. the year-tab buttons in
  // a heatmap) dispatch a new command without depending on `submit`
  // through a closure cycle. We assign it after `submit` is declared
  // below and read through it inside the year-click callback.
  const submitRef = useRef<((raw: string) => void) | null>(null);

  // Year-click handlers — one per stats command. When the user clicks a
  // year tab inside a rendered heatmap, this fires the equivalent CLI
  // command (e.g. `cf 2024`), which goes through the same flow as if they
  // had typed it: echo line + new output appended to scrollback.
  const handleYearClick = useCallback(
    (cmd: "github" | "leetcode" | "codeforces") => (year: number) => {
      submitRef.current?.(`${cmd} ${year}`);
    },
    [],
  );

  // ─── Command runner ────────────────────────────────────────────────
  // Returns the output for a command. May also have side effects (theme,
  // matrix, mode, clear). All command parsing lives here for now — if it
  // grows past ~20 commands we'll split into a registry.
  const runCommand = useCallback(
    (raw: string): { output: ReactNode | null; clear?: boolean } => {
      const trimmed = raw.trim();
      if (!trimmed) return { output: null };
      const [cmd, ...args] = trimmed.split(/\s+/);
      const arg = args.join(" ");

      switch (cmd.toLowerCase()) {
        case "help":
        case "?":
          return { output: formatHelp().node };

        case "whoami":
          return { output: formatWhoami(data).node };

        case "experience":
        case "work":
          return { output: formatExperience(data).node };

        case "education":
        case "edu":
          return { output: formatEducation(data).node };

        case "skills":
          return { output: formatSkills(data).node };

        case "projects":
        case "p": {
          if (args.length > 0) {
            // Strip any wrapping angle brackets the user might have typed
            // (the help text shows `projects <n>` as syntax — some users
            // type the brackets literally).
            const argRaw = args.join(" ").trim().replace(/^<|>$/g, "");
            const n = parseInt(argRaw, 10);

            // Numeric: index into the list (1-based).
            if (!Number.isNaN(n) && String(n) === argRaw) {
              return { output: formatProjectDetail(data, n).node };
            }

            // Non-numeric: treat as a name. Case-insensitive substring
            // match against project titles — `projects vibelay` resolves
            // the same as `projects Vibelay`. Falls back to a helpful
            // error rather than silently re-listing.
            const lookup = argRaw.toLowerCase();
            const idx = data.projects.findIndex((p) =>
              p.title.toLowerCase().includes(lookup),
            );
            if (idx >= 0) {
              return { output: formatProjectDetail(data, idx + 1).node };
            }
            return {
              output: (
                <span className={styles.errorOutput}>
                  No project matching{" "}
                  <span className={styles.accent}>{argRaw}</span>. Type{" "}
                  <span className={styles.accent}>projects</span> to see the
                  list.
                </span>
              ),
            };
          }
          return { output: formatProjects(data).node };
        }

        case "github":
        case "gh": {
          // Optional year arg: `github 2024` filters the contribution map
          // to that calendar year. Invalid years are silently ignored —
          // the formatter falls back to the default trailing window.
          const yr = args[0] ? parseInt(args[0], 10) : undefined;
          return {
            output: formatGithub(
              data,
              Number.isFinite(yr) ? yr : undefined,
              handleYearClick("github"),
            ).node,
          };
        }

        case "leetcode":
        case "lc": {
          const yr = args[0] ? parseInt(args[0], 10) : undefined;
          return {
            output: formatLeetcode(
              data,
              Number.isFinite(yr) ? yr : undefined,
              handleYearClick("leetcode"),
            ).node,
          };
        }

        case "codeforces":
        case "cf": {
          const yr = args[0] ? parseInt(args[0], 10) : undefined;
          return {
            output: formatCodeforces(
              data,
              Number.isFinite(yr) ? yr : undefined,
              handleYearClick("codeforces"),
            ).node,
          };
        }

        case "socials":
        case "contact":
          return { output: formatSocials(data).node };

        case "writing":
        case "blog":
        case "articles":
          return { output: formatDevto(data).node };

        case "ml":
        case "models":
        case "huggingface":
        case "hf":
          return { output: formatHuggingface(data).node };

        case "links":
          return { output: formatLinks(data).node };

        case "files":
        case "resume":
          return { output: formatFiles(data).node };

        case "pdf":
        case "download": {
          // PDF export currently unavailable — client-side window.print()
          // proved unreliable on heavy pages; a server-side route is
          // queued. Surface this honestly rather than silently failing.
          return {
            output: (
              <span className={styles.dim}>
                pdf export coming soon — use{" "}
                <span className={styles.accent}>Ctrl+P</span> in the meantime
              </span>
            ),
          };
        }

        case "theme": {
          const t = args[0]?.toLowerCase();
          if (t === "green" || t === "amber" || t === "blue") {
            setTheme(t as Theme);
            return {
              output: (
                <span className={styles.dim}>
                  theme set to <span className={styles.accent}>{t}</span>
                </span>
              ),
            };
          }
          return {
            output: (
              <span className={styles.errorOutput}>
                Usage: theme [green|amber|blue]
              </span>
            ),
          };
        }

        case "matrix": {
          const t = args[0]?.toLowerCase();
          if (t === "on" || t === "off") {
            setMatrix(t === "on");
            return {
              output: (
                <span className={styles.dim}>
                  matrix rain: {t === "on" ? "enabled" : "disabled"}
                </span>
              ),
            };
          }
          // Toggle if no arg
          setMatrix((m) => !m);
          return {
            output: <span className={styles.dim}>matrix toggled</span>,
          };
        }

        case "mode": {
          const t = args[0]?.toLowerCase();
          if (t === "cli" || t === "scroll") {
            setMode(t as Mode);
            return {
              output: (
                <span className={styles.dim}>
                  mode: <span className={styles.accent}>{t}</span>
                </span>
              ),
            };
          }
          return {
            output: (
              <span className={styles.errorOutput}>
                Usage: mode [cli|scroll]
              </span>
            ),
          };
        }

        case "clear":
        case "cls":
          return { output: null, clear: true };

        case "make":
        case "pofolio": {
          // CTA to the Pofolio landing page. Rendered as a small bordered
          // card with a clickable Make link — visible without scrolling
          // since the user just ran the command.
          return {
            output: (
              <div
                style={{
                  border: "1px dashed var(--t-accent-dim)",
                  padding: "12px 16px",
                  margin: "4px 0",
                  fontSize: 13,
                }}
              >
                <div style={{ color: "var(--t-muted)", fontSize: 11, marginBottom: 4 }}>
                  Built with Pofolio
                </div>
                <div style={{ color: "var(--t-fg)", marginBottom: 8 }}>
                  Auto-updating dev portfolio at one URL.
                </div>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--t-accent)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  Make your own ↗
                </a>
              </div>
            ),
          };
        }

        case "echo":
          return { output: <span>{arg}</span> };

        case "ls": {
          // Cute easter egg: ls lists the available "sections" as if they
          // were files. Real terminals list directory contents — this
          // mirrors that affordance.
          const entries = [
            "whoami",
            "experience",
            "education",
            "skills",
            "projects",
            "github",
            "leetcode",
            "codeforces",
            "writing",
            "ml",
            "links",
            "files",
            "socials",
          ];
          return {
            output: (
              <div className={styles.output}>
                {entries.map((e) => (
                  <span
                    key={e}
                    className={styles.accent}
                    style={{ marginRight: 16 }}
                  >
                    {e}
                  </span>
                ))}
              </div>
            ),
          };
        }

        case "date":
          return { output: <span>{new Date().toString()}</span> };

        case "exit":
        case "logout":
          return {
            output: (
              <span className={styles.dim}>
                Nice try. Close the tab to log out.
              </span>
            ),
          };

        default:
          return {
            output: (
              <span className={styles.errorOutput}>
                {cmd}: command not found. Type{" "}
                <span className={styles.accent}>help</span>.
              </span>
            ),
          };
      }
    },
    [data, handleYearClick],
  );

  // ─── Submit handler ────────────────────────────────────────────────
  const submit = useCallback(
    (raw: string) => {
      const result = runCommand(raw);
      // Track in command history for ↑/↓ even if it produced no output.
      if (raw.trim()) {
        setCommandHistory((h) => [...h, raw]);
      }
      setHistoryCursor(null);

      if (result.clear) {
        setHistory([]);
        return;
      }
      if (result.output === null && !raw.trim()) {
        // Empty submit, no echo, no change.
        return;
      }
      setHistory((h) => [
        ...h,
        {
          id: `${Date.now()}-${Math.random()}`,
          echo: raw,
          output: result.output ?? null,
        },
      ]);
    },
    [runCommand],
  );

  // Keep submitRef pointing at the latest submit callback. The year-tab
  // click handlers read through this ref to dispatch new commands.
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // ─── Key handler — Enter, Up/Down, Tab ─────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(input);
      setInput("");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      // Walk backward through history. null cursor = bottom (current input).
      const next =
        historyCursor === null
          ? commandHistory.length - 1
          : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setInput(commandHistory[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyCursor === null) return;
      const next = historyCursor + 1;
      if (next >= commandHistory.length) {
        setHistoryCursor(null);
        setInput("");
      } else {
        setHistoryCursor(next);
        setInput(commandHistory[next]);
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Simple completion: match the first word against the command list.
      const COMMANDS = [
        "help",
        "whoami",
        "experience",
        "education",
        "skills",
        "projects",
        "github",
        "leetcode",
        "codeforces",
        "writing",
        "ml",
        "links",
        "files",
        "socials",
        "pdf",
        "make",
        "theme",
        "matrix",
        "mode",
        "clear",
        "ls",
        "echo",
        "date",
      ];
      const prefix = input.trim();
      const matches = COMMANDS.filter((c) => c.startsWith(prefix));
      if (matches.length === 1) {
        setInput(matches[0] + " ");
      } else if (matches.length > 1) {
        // Show the candidate list as output (like bash's tab-tab behaviour).
        setHistory((h) => [
          ...h,
          {
            id: `${Date.now()}-${Math.random()}`,
            output: (
              <div className={styles.output}>
                {matches.map((m) => (
                  <span
                    key={m}
                    className={styles.accent}
                    style={{ marginRight: 16 }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            ),
          },
        ]);
      }
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      // Ctrl+L clears the screen, just like a real terminal.
      e.preventDefault();
      setHistory([]);
    }
  };

  // ─── Click anywhere = focus input. Skip when selecting text. ──────
  const onRootClick = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).tagName === "A") return; // let link clicks pass
    inputRef.current?.focus();
  };

  // ─── Banner: ascii name if it fits, else plain text title ─────────
  const banner = useMemo(() => {
    if (bannerWouldOverflow(data.displayName)) {
      // Falls back to plain large text — keeps long names readable.
      return null;
    }
    return asciiBanner(data.displayName);
  }, [data.displayName]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div
      className={styles.root}
      data-theme={theme}
      onClick={onRootClick}
      // Pass the font family down via CSS var so the canvas can use it too.
      // var(--font-mono) is JetBrains Mono, loaded globally via next/font in
      // the root layout — we just borrow the loaded variable so we don't
      // re-fetch the font. (Self-contained doesn't mean reload-everything.)
      style={{ ["--t-font-mono" as string]: "var(--font-mono)" }}
    >
      {/* Background effects — drawn under everything */}
      <MatrixRain enabled={matrix} />
      <div className={styles.scanlines} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      {/* Fixed mode switcher in top-right */}
      <div className={styles.modeSwitch} role="tablist" aria-label="View mode">
        <button
          type="button"
          data-active={mode === "cli"}
          onClick={() => setMode("cli")}
          role="tab"
          aria-selected={mode === "cli"}
        >
          CLI
        </button>
        <button
          type="button"
          data-active={mode === "scroll"}
          onClick={() => setMode("scroll")}
          role="tab"
          aria-selected={mode === "scroll"}
        >
          Scroll
        </button>
        {/* PDF download button removed — client-side window.print() proved
            unreliable. Server-side PDF route queued as a separate task. */}
      </div>

      {mode === "cli" ? (
        <CliView
          banner={banner}
          displayName={data.displayName}
          headline={data.headline}
          history={history}
          input={input}
          setInput={setInput}
          onKeyDown={onKeyDown}
          inputRef={inputRef}
          scrollAnchorRef={scrollAnchorRef}
          promptStr={promptStr}
          booted={booted}
          data={data}
        />
      ) : (
        <ScrollView data={data} />
      )}
    </div>
  );
}

/* ─── CLI view ───────────────────────────────────────────────────────── */

function CliView({
  banner,
  displayName,
  headline,
  history,
  input,
  setInput,
  onKeyDown,
  inputRef,
  scrollAnchorRef,
  promptStr,
  booted,
  data,
}: {
  banner: string | null;
  displayName: string;
  headline?: string;
  history: HistoryItem[];
  input: string;
  setInput: (s: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  scrollAnchorRef: React.RefObject<HTMLDivElement | null>;
  promptStr: string;
  booted: boolean;
  data: LayoutData;
}) {
  return (
    <div className={styles.content}>
      <StatusBar data={data} />

      {/* Boot lines — only shown briefly */}
      {!booted && <BootSequence />}

      {/* ASCII banner (or text title fallback) */}
      {booted && (
        <>
          {banner ? (
            <pre className={styles.banner} aria-label={displayName}>
              {banner}
            </pre>
          ) : (
            <h1 className={styles.banner} style={{ fontSize: 28 }}>
              {displayName.toUpperCase()}
            </h1>
          )}
          {headline && (
            <p className={styles.tagline}>
              <em>{headline}</em>
            </p>
          )}
        </>
      )}

      {/* History */}
      <ul className={styles.history}>
        {history.map((item) => (
          <li key={item.id} className={styles.historyItem}>
            {item.echo !== undefined && (
              <div className={styles.echoLine}>
                <span className={styles.prompt}>{promptStr}</span>{" "}
                <span className={styles.input}>{item.echo}</span>
              </div>
            )}
            {item.output && <div className={styles.output}>{item.output}</div>}
          </li>
        ))}
      </ul>

      {/* Live prompt */}
      {booted && (
        <div className={styles.promptRow}>
          <span className={styles.prompt}>{promptStr}</span>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Terminal input"
            />
            <span className={styles.caret} aria-hidden />
          </div>
        </div>
      )}

      <div ref={scrollAnchorRef} />
    </div>
  );
}

/* ─── Status bar — top of CLI ─────────────────────────────────────── */

function StatusBar({ data }: { data: LayoutData }) {
  return (
    <div className={styles.statusBar}>
      <span className={styles.statusItem}>
        <span className={styles.statusDot} aria-hidden />
        <span>online</span>
      </span>
      <span className={styles.statusItem}>
        <span className={styles.statusKey}>USER</span>
        <span>{data.slug || "guest"}</span>
      </span>
      <span className={styles.statusSpacer} />
      {/* CTA in status-bar so it's visible without scrolling. The CLI can't
          easily show a fixed footer (would conflict with the input row), so
          the top status bar carries the "this is a Pofolio" credit and
          surfaces the `make` command. */}
      <span className={styles.statusItem}>
        <span>built with</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--t-accent)", textDecoration: "none" }}
        >
          pofolio
        </a>
        <span style={{ color: "var(--t-subtle)" }}>·</span>
        <span>
          type <span className={styles.statusKey}>make</span>
        </span>
      </span>
    </div>
  );
}

/* ─── Boot sequence — fake systemd lines ───────────────────────────── */

function BootSequence() {
  const lines = [
    "Pofolio v1.0 starting",
    "Mounting /portfolio",
    "Fetching github.dat",
    "Loading leetcode.idx",
    "Initializing terminal",
    "Done.",
  ];
  return (
    <div className={styles.boot}>
      {lines.map((line, i) => (
        <div
          key={line}
          className={styles.bootLine}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span className={styles.bootOk}>[  OK  ]</span> {line}
        </div>
      ))}
    </div>
  );
}

/* ─── Scroll view — non-CLI fallback ───────────────────────────────── */

function ScrollView({ data }: { data: LayoutData }) {
  // Per-platform year state. The CLI dispatches `gh 2024` into history;
  // scroll view has no scrollback, so each section keeps its own year and
  // the click handler updates it locally — re-renders just that section.
  // undefined = use the formatter's default (most recent year).
  const [ghYear, setGhYear] = useState<number | undefined>(undefined);
  const [lcYear, setLcYear] = useState<number | undefined>(undefined);
  const [cfYear, setCfYear] = useState<number | undefined>(undefined);

  return (
    <div className={styles.scrollMode}>
      <h1 className={styles.heroName}>{data.displayName}</h1>
      {data.headline && <p className={styles.heroHeadline}>{data.headline}</p>}
      {data.bio && <p className={styles.heroBio}>{data.bio}</p>}

      {data.experience.length > 0 && (
        <ScrollSection title="experience">
          {formatExperience(data).node}
        </ScrollSection>
      )}
      {data.education.length > 0 && (
        <ScrollSection title="education">
          {formatEducation(data).node}
        </ScrollSection>
      )}
      {/* Skills section is gated on skillGroups since the page loader
          auto-migrates flat skills into a group. So if a user has either,
          this renders. */}
      {data.skillGroups.length > 0 && (
        <ScrollSection title="skills">
          {formatSkills(data).node}
        </ScrollSection>
      )}
      {data.projects.length > 0 && (
        <ScrollSection title="projects">
          {formatProjects(data).node}
        </ScrollSection>
      )}
      {data.github && (
        <ScrollSection title="github">
          {formatGithub(data, ghYear, setGhYear).node}
        </ScrollSection>
      )}
      {data.leetcode && (
        <ScrollSection title="leetcode">
          {formatLeetcode(data, lcYear, setLcYear).node}
        </ScrollSection>
      )}
      {data.codeforces && (
        <ScrollSection title="codeforces">
          {formatCodeforces(data, cfYear, setCfYear).node}
        </ScrollSection>
      )}
      {data.devto && (
        <ScrollSection title="writing">
          {formatDevto(data).node}
        </ScrollSection>
      )}
      {data.huggingface && (
        <ScrollSection title="ml works">
          {formatHuggingface(data).node}
        </ScrollSection>
      )}
      {data.customLinks.length > 0 && (
        <ScrollSection title="links">{formatLinks(data).node}</ScrollSection>
      )}
      {(data.resumeCloudinaryId || data.files.length > 0) && (
        <ScrollSection title="files">{formatFiles(data).node}</ScrollSection>
      )}
      <ScrollSection title="socials">{formatSocials(data).node}</ScrollSection>

      {/* "Make your own" CTA — the same closer that the CLI footer would
          show. Links to / so any visitor who reaches the bottom of the
          scroll view can find Pofolio. */}
      <MakeYourOwnCTA />
    </div>
  );
}

/* ─── Make your own CTA ─────────────────────────────────────────────
 * Closing card at the bottom of scroll-mode. Mirrors the kind of "made
 * with X — try it yourself" footer that other portfolio platforms use.
 * Visually styled to feel native to the terminal: dashed bordered card,
 * accent-color CTA button that fills on hover.
 */
function MakeYourOwnCTA() {
  return (
    <section
      style={{
        marginTop: 48,
        marginBottom: 24,
        padding: "24px",
        border: "1px dashed var(--t-accent-dim)",
        textAlign: "center",
        fontFamily: "var(--t-font-mono), monospace",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--t-muted)",
          marginBottom: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Built with Pofolio
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--t-fg)",
          marginBottom: 16,
        }}
      >
        Auto-updating dev portfolio at one URL.
      </div>
      <a
        href="/"
        style={{
          display: "inline-block",
          padding: "8px 20px",
          border: "1px solid var(--t-accent)",
          color: "var(--t-accent)",
          textDecoration: "none",
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 600,
          transition: "background 120ms, color 120ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--t-accent)";
          e.currentTarget.style.color = "var(--t-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--t-accent)";
        }}
      >
        Make your own ↗
      </a>
    </section>
  );
}