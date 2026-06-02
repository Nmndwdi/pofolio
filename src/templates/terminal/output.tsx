import type { ReactNode } from "react";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./terminal.module.css";

/*
 * Output formatters. Each function takes a slice of LayoutData and returns a
 * React node representing terminal-shaped output (sections, key/value rows,
 * entries with borders, link footnotes).
 *
 * Why React nodes instead of strings:
 *   - Real terminals render plain text. But we WANT clickable links, colored
 *     accents, hover states. Returning JSX lets us be a terminal in spirit
 *     while still being a webpage in mechanics.
 *   - Each formatter renders into the same scoped CSS (./terminal.module.css)
 *     so the visual language stays consistent.
 *
 * The numeric link footnotes ([1], [2], ...) are a real terminal convention
 * (lynx, w3m, mutt all do this). We render the [n] inline and list the URLs
 * at the bottom — clickable. This is much more "terminal" than rendering
 * every URL inline as a link.
 */

interface FormatResult {
  node: ReactNode;
}

/** whoami — name, headline, bio */
export function formatWhoami(data: LayoutData): FormatResult {
  return {
    node: (
      <div>
        <div className={styles.outputSection}>identity</div>
        <KV k="name" v={data.displayName} />
        {data.headline && <KV k="role" v={data.headline} />}
        {data.socials.email && <KV k="email" v={data.socials.email} />}
        {data.bio && (
          <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
            {data.bio}
          </div>
        )}
      </div>
    ),
  };
}

/** experience — list of timeline entries as bordered terminal cards */
export function formatExperience(data: LayoutData): FormatResult {
  if (data.experience.length === 0) {
    return {
      node: <span className={styles.dim}>No experience entries.</span>,
    };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>
          experience ({data.experience.length})
        </div>
        {data.experience.map((e) => (
          <div key={e.id} className={styles.entry}>
            <div className={styles.entryHead}>
              <span className={styles.entryTitle}>
                {e.role || "Role unspecified"}
              </span>
              <span className={styles.entryMeta}>{e.dates}</span>
            </div>
            {e.company && <div className={styles.entrySub}>@ {e.company}</div>}
            {e.summary && (
              <div className={styles.entryBody}>{e.summary}</div>
            )}
          </div>
        ))}
      </div>
    ),
  };
}

/** education — compact list */
export function formatEducation(data: LayoutData): FormatResult {
  if (data.education.length === 0) {
    return {
      node: <span className={styles.dim}>No education entries.</span>,
    };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>education</div>
        {data.education.map((e) => (
          <div key={e.id} style={{ margin: "8px 0" }}>
            <div>
              <span className={styles.accent}>{e.institution}</span>
              {e.dates && (
                <span className={styles.dim}> · {e.dates}</span>
              )}
            </div>
            {e.degree && <div className={styles.dim}>{e.degree}</div>}
          </div>
        ))}
      </div>
    ),
  };
}

/** skills — comma-separated list, mono spacing */
export function formatSkills(data: LayoutData): FormatResult {
  if (data.skills.length === 0) {
    return { node: <span className={styles.dim}>No skills listed.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>skills</div>
        <div className={styles.chipRow}>
          {data.skills.map((s) => (
            <span key={s} className={styles.chip}>
              {s}
            </span>
          ))}
        </div>
      </div>
    ),
  };
}

/** projects — compact list. Each row is one line: title + role/year. For
 * full details (description, tech, images, links) the visitor types
 * `projects <n>`. Two distinct views keeps the list scannable while still
 * making rich details one keystroke away.
 */
export function formatProjects(data: LayoutData): FormatResult {
  if (data.projects.length === 0) {
    return { node: <span className={styles.dim}>No projects yet.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>
          projects ({data.projects.length})
        </div>
        <div className={styles.dim} style={{ marginBottom: 8, fontSize: 12 }}>
          Type{" "}
          <span className={styles.accent}>projects &lt;n&gt;</span> for full
          details (images, tech stack, links, description).
        </div>
        {data.projects.map((p, i) => {
          const imgCount = p.images?.length ?? 0;
          return (
            <div key={p.id} style={{ margin: "4px 0", fontSize: 13 }}>
              <span className={styles.accent}>[{i + 1}]</span>{" "}
              <span style={{ color: "var(--t-fg)" }}>{p.title}</span>
              {(p.year || p.role) && (
                <span className={styles.dim}>
                  {" — "}
                  {[p.role, p.year].filter(Boolean).join(", ")}
                </span>
              )}
              {imgCount > 0 && (
                <span className={styles.dim}>
                  {" · "}
                  {imgCount} image{imgCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
    ),
  };
}

/** projects N — detail view for a single project */
export function formatProjectDetail(
  data: LayoutData,
  index: number,
): FormatResult {
  const p = data.projects[index - 1];
  if (!p) {
    return {
      node: (
        <span className={styles.errorOutput}>
          No project at index [{index}]. Try{" "}
          <span className={styles.accent}>projects</span> to list.
        </span>
      ),
    };
  }
  return {
    node: (
      <div className={styles.entry}>
        <div className={styles.entryHead}>
          <span className={styles.entryTitle}>{p.title}</span>
          <span className={styles.entryMeta}>
            {[p.role, p.year].filter(Boolean).join(" · ")}
          </span>
        </div>
        {p.description && (
          <div className={styles.entryBody}>{p.description}</div>
        )}
        {p.tech && p.tech.length > 0 && (
          <div className={styles.chipRow}>
            {p.tech.map((t) => (
              <span key={t} className={styles.chip}>
                {t}
              </span>
            ))}
          </div>
        )}
        {(p.demoUrl || p.sourceUrl || p.videoUrl) && (
          <div style={{ marginTop: 10 }}>
            {p.demoUrl && (
              <Link href={p.demoUrl} label="demo" />
            )}
            {p.sourceUrl && (
              <>
                {p.demoUrl && <span className={styles.dim}> · </span>}
                <Link href={p.sourceUrl} label="source" />
              </>
            )}
            {p.videoUrl && (
              <>
                {(p.demoUrl || p.sourceUrl) && (
                  <span className={styles.dim}> · </span>
                )}
                <Link href={p.videoUrl} label="video" />
              </>
            )}
          </div>
        )}
        {p.images && p.images.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div
              className={styles.dim}
              style={{ fontSize: 11, marginBottom: 6 }}
            >
              {p.images.length} image{p.images.length > 1 ? "s" : ""}:
            </div>
            {/* Inline image previews — real DOM <img> styled to feel native
                to the terminal. Thin accent border, mono caption, slight
                phosphor-bloom drop-shadow. Up to 3 rendered inline; more
                are listed as text links below to keep the scrollback fast. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                marginBottom: 8,
              }}
            >
              {p.images.slice(0, 3).map((img, i) => (
                <figure
                  key={img.id}
                  style={{ margin: 0, padding: 0, maxWidth: 640 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={deriveCloudinary(img.publicId, "image")}
                    alt={img.caption || `image ${i + 1}`}
                    loading="lazy"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                      border: "1px solid var(--t-accent-dim)",
                      boxShadow: "0 0 8px var(--t-accent-dim)",
                    }}
                  />
                  <figcaption
                    className={styles.dim}
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      fontFamily: "var(--t-font-mono), monospace",
                    }}
                  >
                    [{i + 1}] {img.caption || `image-${i + 1}`}
                  </figcaption>
                </figure>
              ))}
            </div>
            {p.images.length > 3 && (
              <div
                className={styles.dim}
                style={{ fontSize: 11, marginTop: 6 }}
              >
                + {p.images.length - 3} more:
                {p.images.slice(3).map((img, idx) => (
                  <span key={img.id}>
                    {idx > 0 && ", "}{" "}
                    <Link
                      href={deriveCloudinary(img.publicId, "image")}
                      label={img.caption || `image-${idx + 4}`}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ),
  };
}

/** github — stats summary
 * Optional `year` filters the contribution heatmap to that calendar year.
 * If omitted, shows the most recent trailing-year window.
 * `onYearClick` (if provided) wires the year tabs in the heatmap header so
 * the user can click instead of typing `github <year>`.
 */
export function formatGithub(
  data: LayoutData,
  year?: number,
  onYearClick?: (year: number) => void,
): FormatResult {
  const g = data.github?.data;
  if (!g) {
    return {
      node: <span className={styles.dim}>GitHub data unavailable.</span>,
    };
  }

  // Derive available years from contribution days for the year selector
  // hint. GitHub returns ~1 year of data so this is usually 1-2 years.
  const years = Array.from(
    new Set(
      (g.contributions?.days ?? []).map((d) =>
        new Date(d.date).getFullYear(),
      ),
    ),
  ).sort((a, b) => b - a);

  // Use the integration's pre-computed `totalStars` and `languageBreakdown`
  // (across ALL non-fork repos, not just the top ~5 we surface). Matches
  // what the single-page Code section reads from — was previously
  // computing locally from topRepos which under-counted both stats.
  const totalStars = g.totalStars;
  const languages = g.languageBreakdown;

  return {
    node: (
      <div>
        <div className={styles.outputSection}>github</div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>user</span>
          <span className={styles.kvValue}>
            <Link
              href={`https://github.com/${g.user.login}`}
              label={`@${g.user.login}`}
            />
          </span>
        </div>
        {g.user.bio && <KV k="bio" v={g.user.bio} />}
        <KV k="repos" v={String(g.user.publicRepos)} />
        <KV k="stars" v={String(totalStars)} />
        <KV k="followers" v={String(g.user.followers)} />
        {g.contributions && (
          <KV
            k="contributions"
            v={`${g.contributions.total.toLocaleString()}${year ? ` (${year})` : " (last year)"}`}
          />
        )}
        {g.contributions && g.contributions.days.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              contribution map
            </div>
            <AsciiHeatmap
              days={g.contributions.days}
              year={year}
              availableYears={years}
              onYearClick={onYearClick}
              commandPrefix="github"
            />
            {years.length > 1 && !onYearClick && (
              <div className={styles.dim} style={{ fontSize: 11, marginTop: 4 }}>
                Try{" "}
                <span className={styles.accent}>github {years[1]}</span> for
                another year.
              </div>
            )}
          </>
        )}
        {g.topRepos.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              top repos
            </div>
            {g.topRepos.slice(0, 6).map((r) => (
              <div key={r.name} style={{ margin: "4px 0" }}>
                <Link href={r.htmlUrl} label={r.name} />
                {r.stars > 0 && (
                  <span className={styles.dim}> ★ {r.stars}</span>
                )}
                {r.language && (
                  <span className={styles.dim}>
                    {" · "}
                    <span style={{ color: languageColor(r.language) }}>●</span>{" "}
                    {r.language}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
        {languages.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              languages
            </div>
            <div className={styles.chipRow}>
              {languages.map((l) => (
                <span key={l.language} className={styles.chip}>
                  <span style={{ color: languageColor(l.language) }}>●</span>{" "}
                  {l.language}{" "}
                  <span className={styles.dim}>×{l.count}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    ),
  };
}

/** leetcode — solved counts + rating + heatmap + rating chart
 * Optional `year` filters the submission heatmap to that calendar year.
 */
export function formatLeetcode(
  data: LayoutData,
  year?: number,
  onYearClick?: (year: number) => void,
): FormatResult {
  const l = data.leetcode?.data;
  if (!l) {
    return {
      node: <span className={styles.dim}>LeetCode data unavailable.</span>,
    };
  }

  // Approximate problem-pool totals as of ~2025-12. Not authoritative —
  // LeetCode adds problems weekly — but lets us show "153 / 875" ratios
  // that match what the single-page LeetCode section displays.
  const TOTALS = { easy: 875, medium: 1900, hard: 860 };

  const years = Array.from(
    new Set(
      (l.submissionHeatmap ?? []).map((d) => new Date(d.date).getFullYear()),
    ),
  ).sort((a, b) => b - a);

  // Compute max streak from the heatmap — single-page shows this; we should
  // too. A streak is a run of consecutive days with count > 0.
  const maxStreak = (() => {
    if (!l.submissionHeatmap || l.submissionHeatmap.length === 0) return 0;
    const sorted = [...l.submissionHeatmap].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let max = 0;
    let cur = 0;
    let prevDate: Date | null = null;
    for (const d of sorted) {
      if (d.count === 0) {
        cur = 0;
        prevDate = null;
        continue;
      }
      const today = new Date(d.date);
      if (prevDate) {
        const diff =
          (today.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      if (cur > max) max = cur;
      prevDate = today;
    }
    return max;
  })();

  const totalSubmissions = (l.submissionHeatmap ?? []).reduce(
    (s, d) => s + d.count,
    0,
  );

  return {
    node: (
      <div>
        <div className={styles.outputSection}>leetcode</div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>user</span>
          <span className={styles.kvValue}>
            <Link
              href={`https://leetcode.com/u/${l.username}/`}
              label={`@${l.username}`}
            />
          </span>
        </div>
        {l.realName && <KV k="name" v={l.realName} />}
        {l.country && <KV k="country" v={l.country} />}
        {l.ranking !== null && (
          <KV k="rank" v={l.ranking.toLocaleString()} />
        )}
        <KV
          k="solved"
          v={`${l.totalSolved} / ${TOTALS.easy + TOTALS.medium + TOTALS.hard}`}
        />
        <KV k="  easy" v={`${l.easySolved} / ${TOTALS.easy}`} />
        <KV k="  medium" v={`${l.mediumSolved} / ${TOTALS.medium}`} />
        <KV k="  hard" v={`${l.hardSolved} / ${TOTALS.hard}`} />
        {l.currentStreak !== undefined && (
          <KV k="streak" v={`${l.currentStreak} days`} />
        )}
        {maxStreak > 0 && <KV k="max streak" v={`${maxStreak} days`} />}
        {l.totalActiveDays !== undefined && (
          <KV k="active days" v={String(l.totalActiveDays)} />
        )}
        {l.contestHistory && l.contestHistory.length > 0 && (
          <KV
            k="latest rating"
            v={String(
              l.contestHistory[l.contestHistory.length - 1]?.rating ?? "—",
            )}
          />
        )}
        {l.submissionHeatmap && l.submissionHeatmap.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              submission map
            </div>
            <div className={styles.dim} style={{ fontSize: 11 }}>
              {totalSubmissions} submissions · max streak {maxStreak}
            </div>
            <AsciiHeatmap
              days={l.submissionHeatmap}
              year={year}
              availableYears={years}
              onYearClick={onYearClick}
              commandPrefix="leetcode"
            />
            {years.length > 1 && !onYearClick && (
              <div className={styles.dim} style={{ fontSize: 11, marginTop: 4 }}>
                Try{" "}
                <span className={styles.accent}>leetcode {years[1]}</span> for
                another year.
              </div>
            )}
          </>
        )}
        {l.contestHistory && l.contestHistory.length >= 2 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              contest rating
            </div>
            <AsciiLineChart
              points={l.contestHistory.map((c) => ({
                t: c.timestamp,
                v: c.rating,
              }))}
              label={`${l.contestHistory.length} contests`}
            />
          </>
        )}
      </div>
    ),
  };
}

/** codeforces — rating, rank, submission map, rating chart, recent contests
 * Optional `year` filters the submission heatmap to that calendar year.
 */
export function formatCodeforces(
  data: LayoutData,
  year?: number,
  onYearClick?: (year: number) => void,
): FormatResult {
  const c = data.codeforces?.data;
  if (!c) {
    return {
      node: <span className={styles.dim}>Codeforces data unavailable.</span>,
    };
  }

  const years = Array.from(
    new Set(
      (c.submissionHeatmap ?? []).map((d) => new Date(d.date).getFullYear()),
    ),
  ).sort((a, b) => b - a);

  // Compute submission stats — single-page shows "X submissions · Y active
  // days · max streak Z" header above the heatmap; we mirror that here.
  const totalSubmissions = (c.submissionHeatmap ?? []).reduce(
    (s, d) => s + d.count,
    0,
  );
  const activeDays = (c.submissionHeatmap ?? []).filter((d) => d.count > 0)
    .length;
  const maxStreak = (() => {
    if (!c.submissionHeatmap || c.submissionHeatmap.length === 0) return 0;
    const sorted = [...c.submissionHeatmap].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let max = 0;
    let cur = 0;
    let prevDate: Date | null = null;
    for (const d of sorted) {
      if (d.count === 0) {
        cur = 0;
        prevDate = null;
        continue;
      }
      const today = new Date(d.date);
      if (prevDate) {
        const diff =
          (today.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      if (cur > max) max = cur;
      prevDate = today;
    }
    return max;
  })();

  return {
    node: (
      <div>
        <div className={styles.outputSection}>codeforces</div>
        <div className={styles.kvRow}>
          <span className={styles.kvKey}>handle</span>
          <span className={styles.kvValue}>
            <Link
              href={`https://codeforces.com/profile/${c.user.handle}`}
              label={`@${c.user.handle}`}
            />
          </span>
        </div>
        {c.user.rating !== null && (
          <KV k="rating" v={`${c.user.rating} (max ${c.user.maxRating})`} />
        )}
        {c.user.rank && <KV k="rank" v={c.user.rank} />}
        {c.user.country && <KV k="country" v={c.user.country} />}
        {c.user.organization && <KV k="org" v={c.user.organization} />}
        <KV k="contests" v={String(c.contestsParticipated)} />
        {c.submissionHeatmap && c.submissionHeatmap.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              submission map
            </div>
            <div className={styles.dim} style={{ fontSize: 11 }}>
              {totalSubmissions} submissions · {activeDays} active days · max
              streak {maxStreak}
            </div>
            <AsciiHeatmap
              days={c.submissionHeatmap}
              year={year}
              availableYears={years}
              onYearClick={onYearClick}
              commandPrefix="codeforces"
            />
            {years.length > 1 && !onYearClick && (
              <div className={styles.dim} style={{ fontSize: 11, marginTop: 4 }}>
                Try{" "}
                <span className={styles.accent}>codeforces {years[1]}</span>{" "}
                for another year.
              </div>
            )}
          </>
        )}
        {c.ratingHistory && c.ratingHistory.length >= 2 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              rating history
            </div>
            <AsciiLineChart
              points={c.ratingHistory.map((r) => ({
                t: r.timestamp,
                v: r.rating,
              }))}
              label={`${c.ratingHistory.length} contests tracked`}
            />
          </>
        )}
        {c.recentContests && c.recentContests.length > 0 && (
          <>
            <div className={styles.outputSection} style={{ marginTop: 12 }}>
              recent contests
            </div>
            {c.recentContests.slice(0, 5).map((r) => {
              const delta = r.newRating - r.oldRating;
              const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
              const deltaColor = delta >= 0 ? "var(--t-accent)" : "var(--t-error)";
              return (
                <div
                  key={r.contestId}
                  style={{ margin: "4px 0", fontSize: 13 }}
                >
                  <span style={{ color: "var(--t-fg)" }}>{r.contestName}</span>
                  <div className={styles.dim} style={{ fontSize: 11 }}>
                    rank {r.rank.toLocaleString()} ·{" "}
                    <span style={{ color: deltaColor }}>{deltaStr}</span> ·{" "}
                    {new Date(r.timestamp * 1000).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    ),
  };
}

/** socials — list of social links */
export function formatSocials(data: LayoutData): FormatResult {
  const entries: Array<{ label: string; url: string }> = [];
  if (data.socials.linkedin)
    entries.push({ label: "linkedin", url: data.socials.linkedin });
  if (data.socials.twitter)
    entries.push({
      label: "twitter",
      url: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  if (data.socials.website)
    entries.push({ label: "website", url: data.socials.website });
  if (data.socials.email)
    entries.push({
      label: "email",
      url: `mailto:${data.socials.email}`,
    });
  if (data.socials.github)
    entries.push({
      label: "github",
      url: `https://github.com/${data.socials.github}`,
    });

  if (entries.length === 0) {
    return { node: <span className={styles.dim}>No social links.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>socials</div>
        {entries.map((e) => (
          <div key={e.label} className={styles.kvRow}>
            <span className={styles.kvKey}>{e.label}</span>
            <Link href={e.url} label={e.url} />
          </div>
        ))}
      </div>
    ),
  };
}

/** help — list available commands */
export function formatHelp(): FormatResult {
  const commands: Array<[string, string]> = [
    ["help", "show this help"],
    ["whoami", "name, role, contact"],
    ["experience", "work history"],
    ["education", "schools / degrees"],
    ["skills", "tech stack"],
    ["projects", "list projects (use `projects <n>` for detail)"],
    ["github [year]", "github stats + contribution heatmap"],
    ["leetcode [year]", "leetcode stats + submission heatmap + rating chart"],
    ["codeforces [year]", "codeforces rating + chart + recent contests"],
    ["writing", "dev.to articles"],
    ["ml", "hugging face models / datasets / spaces"],
    ["links", "custom links"],
    ["files", "resume + uploaded files"],
    ["socials", "social links"],
    ["pdf", "download portfolio as PDF (print dialog)"],
    ["make", "build your own Pofolio"],
    ["theme [green|amber|blue]", "switch color theme"],
    ["matrix [on|off]", "toggle matrix rain"],
    ["mode [cli|scroll]", "switch to scroll view"],
    ["clear", "clear the screen"],
  ];
  return {
    node: (
      <div>
        <div className={styles.outputSection}>commands</div>
        {commands.map(([cmd, desc]) => (
          <div key={cmd} className={styles.kvRow}>
            <span className={styles.kvKey}>
              <span className={styles.accent}>{cmd}</span>
            </span>
            <span className={styles.kvValue}>{desc}</span>
          </div>
        ))}
        <div className={styles.dim} style={{ marginTop: 12, fontSize: 12 }}>
          Tip: ↑/↓ cycles previous commands. Tab completes.
        </div>
      </div>
    ),
  };
}

/* ─── New: dev.to / hugging face / links / files / project images ─── */

/** writing — dev.to articles */
export function formatDevto(data: LayoutData): FormatResult {
  const d = data.devto?.data;
  if (!d || d.articles.length === 0) {
    return { node: <span className={styles.dim}>No writing yet.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>
          writing ({d.articles.length})
        </div>
        <div className={styles.dim} style={{ marginBottom: 8, fontSize: 12 }}>
          <Link
            href={`https://dev.to/${d.username}`}
            label={`@${d.username}`}
          />
          {" on Dev.to"}
        </div>
        {d.articles.slice(0, 10).map((a) => (
          <div
            key={a.id}
            className={styles.entry}
            style={{ marginBottom: 10, padding: "10px 12px" }}
          >
            <div style={{ marginBottom: 4 }}>
              <Link href={a.url} label={a.title} />
            </div>
            <div className={styles.dim} style={{ fontSize: 11 }}>
              {new Date(a.publishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {a.readingTimeMinutes
                ? ` · ${a.readingTimeMinutes} min read`
                : ""}
              {a.reactionsCount > 0 ? ` · ♥ ${a.reactionsCount}` : ""}
              {a.tags && a.tags.length > 0
                ? ` · ${a.tags.slice(0, 3).join(", ")}`
                : ""}
            </div>
          </div>
        ))}
      </div>
    ),
  };
}

/** ml — Hugging Face models / datasets / spaces */
export function formatHuggingface(data: LayoutData): FormatResult {
  const hf = data.huggingface?.data;
  if (!hf || hf.items.length === 0) {
    return {
      node: <span className={styles.dim}>No ML items.</span>,
    };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>
          ml works ({hf.items.length})
        </div>
        <div className={styles.dim} style={{ marginBottom: 8, fontSize: 12 }}>
          <Link
            href={`https://huggingface.co/${hf.username}`}
            label={`@${hf.username}`}
          />
          {" on Hugging Face · "}
          {hf.totalModels} models · {hf.totalDatasets} datasets ·{" "}
          {hf.totalSpaces} spaces
        </div>
        {hf.items.slice(0, 12).map((it) => (
          <div key={`${it.kind}-${it.id}`} style={{ margin: "4px 0" }}>
            <span className={styles.accent} style={{ minWidth: 70, display: "inline-block" }}>
              [{it.kind}]
            </span>{" "}
            <Link href={it.url} label={it.name} />
            {it.pipelineTag && (
              <span className={styles.dim}> · {it.pipelineTag}</span>
            )}
            {it.likes > 0 && (
              <span className={styles.dim}> · ♥ {it.likes}</span>
            )}
          </div>
        ))}
      </div>
    ),
  };
}

/** links — custom links list */
export function formatLinks(data: LayoutData): FormatResult {
  if (data.customLinks.length === 0) {
    return { node: <span className={styles.dim}>No custom links.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>links</div>
        {data.customLinks.map((l) => {
          let host = l.url;
          try {
            host = new URL(l.url).host.replace(/^www\./, "");
          } catch {
            /* l.url may not parse as URL */
          }
          return (
            <div key={l.id} className={styles.kvRow}>
              <span className={styles.kvKey}>{l.label}</span>
              <span>
                <Link href={l.url} label={host} />
              </span>
            </div>
          );
        })}
      </div>
    ),
  };
}

/** files — resume + uploaded files (terminal lists URLs; no inline preview) */
export function formatFiles(data: LayoutData): FormatResult {
  const items: Array<{
    label: string;
    url: string;
    format: string;
  }> = [];
  if (data.resumeCloudinaryId) {
    items.push({
      label: "Resume",
      url: deriveCloudinary(data.resumeCloudinaryId, "raw"),
      format: "pdf",
    });
  }
  for (const f of data.files) {
    items.push({
      label: f.label,
      url: deriveCloudinary(f.publicId, f.resourceType),
      format: f.format,
    });
  }
  if (items.length === 0) {
    return { node: <span className={styles.dim}>No files.</span> };
  }
  return {
    node: (
      <div>
        <div className={styles.outputSection}>files ({items.length})</div>
        {items.map((f, i) => (
          <div key={`${f.label}-${i}`} style={{ margin: "4px 0" }}>
            <span className={styles.accent}>[{f.format || "file"}]</span>{" "}
            <span style={{ color: "var(--t-fg)" }}>{f.label}</span>{" "}
            <Link href={f.url} label="open" />
          </div>
        ))}
        <div className={styles.dim} style={{ marginTop: 8, fontSize: 12 }}>
          Tip: type{" "}
          <span className={styles.accent}>pdf</span> to download the portfolio
          as PDF.
        </div>
      </div>
    ),
  };
}

/* ─── Small primitives used above ──────────────────────────────────────── */

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.kvRow}>
      <span className={styles.kvKey}>{k}</span>
      <span className={styles.kvValue}>{v}</span>
    </div>
  );
}

function Link({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // No className from styles needed — the parent .output a rule styles it.
    >
      {label}
    </a>
  );
}

/* GitHub-style language color dot. A small subset of GitHub's linguist
 * palette — covers the languages a CS-portfolio user is most likely to
 * have. Falls back to a neutral grey for unknown languages. Inlined here
 * (rather than imported from GitHubSection) to keep the terminal template
 * fully self-contained.
 */
function languageColor(lang: string): string {
  const map: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#888888",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Shell: "#89e051",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    Lua: "#5b8aa7",
    R: "#198CE7",
    Scala: "#c22d40",
    Haskell: "#5e5086",
    Elixir: "#6e4a7e",
    Jupyter: "#DA5B0B",
  };
  return map[lang] ?? "#888";
}

/* ─── ASCII heatmap renderer ──────────────────────────────────────────
 * Pure-text contribution map for the CLI view. Each cell becomes a single
 * Unicode block character whose density represents activity:
 *   level 0 →  ·   (middle dot — empty)
 *   level 1 →  ░   (light shade)
 *   level 2 →  ▒   (medium shade)
 *   level 3 →  ▓   (dark shade)
 *   level 4 →  █   (full block)
 *
 * Layout — important: cells lay out by CALENDAR POSITION, not insertion
 * order. Column = week-number-since-window-start, row = day-of-week. This
 * mirrors GitHub's familiar 7×N heatmap so a quiet Sunday at the start of
 * the window doesn't overlap a busy Sunday from the end.
 *
 * Year filter: pass `year` to render only that calendar year's data. When
 * omitted, renders the trailing ~53-week window from the latest date in
 * the input.
 */
function AsciiHeatmap({
  days,
  year,
  availableYears,
  onYearClick,
  commandPrefix,
}: {
  days: Array<{ date: string; count: number }>;
  year?: number;
  availableYears?: number[];
  /** Callback when a year tab is clicked. The parent wires this up so the
   *  click runs the equivalent CLI command (e.g. `cf 2025`). Without it,
   *  the years still render but as plain text. */
  onYearClick?: (year: number) => void;
  /** Short label for the underlying command, used in screen-reader / title
   *  text. e.g. "codeforces", "github". */
  commandPrefix?: string;
}) {
  if (days.length === 0) return null;

  // Filter to the requested year if provided. We default to the most recent
  // year in availableYears when year isn't passed — gives a stable "current"
  // year that matches what we render labels for.
  const effectiveYear =
    year ??
    (availableYears && availableYears.length > 0
      ? availableYears[0]
      : undefined);
  const filtered = effectiveYear
    ? days.filter((d) => new Date(d.date).getFullYear() === effectiveYear)
    : days;

  if (filtered.length === 0) {
    return (
      <span className={styles.dim}>
        No activity for {effectiveYear ?? "this window"}.
      </span>
    );
  }

  // Find the window. For year-filtered views we anchor to the first
  // sunday OF THE YEAR so December (the previous year) doesn't bleed in.
  // For the unfiltered view we still snap back from firstDate so the
  // earliest data sits flush at the start of a week column.
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = parseLocalDate(sorted[0].date);
  const lastDate = parseLocalDate(sorted[sorted.length - 1].date);

  const windowStart = (() => {
    if (effectiveYear !== undefined) {
      // Year-filtered: window starts on January 1 of that year exactly.
      // We do NOT snap to Sunday here — instead the rendering pads the
      // leading days with -1 (blanks) for the partial first week. This
      // means month labels start with January, not December (which the
      // snap-to-Sunday approach would pull in when Jan 1 ≠ Sunday).
      return new Date(effectiveYear, 0, 1);
    }
    // Unfiltered: snap back from the first data point to the previous
    // Sunday so the grid is aligned to week boundaries.
    const ws = new Date(firstDate);
    ws.setDate(ws.getDate() - ws.getDay());
    return ws;
  })();

  // Future-day cutoff. For the CURRENT year we still render the full Jan 1
  // → Dec 31 grid so spacing matches other years, but days past today
  // render as blanks (level -1, transparent). That gives "consistent
  // calendar shape regardless of when you visit" — June 2 2026 looks the
  // same width as Dec 31 2025 of the same chart.
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // For year-filtered views the window end is always Dec 31 of the year.
  // (We previously capped at min(today, Dec 31) but that produced narrower
  // grids for the current year — visually inconsistent. Now Dec 31 always
  // wins; future days just render as blanks.)
  const windowEnd = (() => {
    if (effectiveYear !== undefined) {
      return new Date(effectiveYear, 11, 31);
    }
    return lastDate;
  })();

  const msPerDay = 24 * 60 * 60 * 1000;
  // For year-filtered views, totalWeeks covers Jan 1 → windowEnd, with
  // the first column being the week containing Jan 1 (partial). Pad-out
  // happens in the cell loop below — out-of-window cells stay blank.
  const renderStart = (() => {
    if (effectiveYear !== undefined) {
      // Pad the grid back to the Sunday on-or-before windowStart so the
      // grid renders cleanly as 7-row weeks. The cells in those leading
      // days render as blanks.
      const ws = new Date(windowStart);
      ws.setDate(ws.getDate() - ws.getDay());
      return ws;
    }
    return windowStart;
  })();
  const totalDays =
    Math.floor((windowEnd.getTime() - renderStart.getTime()) / msPerDay) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  // Build a date → count map using LOCAL date keys (not UTC). Previously
  // we did toISOString().slice(0,10) which returns UTC; for users east of
  // GMT this could shift the local date back by one (e.g. Indian Standard
  // Time at midnight local was already May 14 UTC, dropping May 15 entries).
  const byDate = new Map(filtered.map((d) => [d.date, d.count]));

  // Bucket into 5 levels using window max as upper bound (relative scale).
  const max = filtered.reduce((m, d) => (d.count > m ? d.count : m), 0);

  // Cell content per (day, week). We store the level (0-4) OR -1 for blank
  // (outside the data window). The renderer below maps each cell to a
  // fixed-width span — that's what guarantees visual alignment regardless
  // of which glyph fills it. A middle-dot (·) and a full block (█) have
  // very different intrinsic widths in many monospace fonts, which made
  // right-side columns visually compress when activity dropped off. Wrapping
  // each cell in a `display:inline-block; width:0.9em` span pins all cells
  // to the same horizontal slot.
  type CellLevel = -1 | 0 | 1 | 2 | 3 | 4;
  const levelFor = (count: number): CellLevel => {
    if (count === 0) return 0;
    if (max <= 1) return 4;
    const r = count / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  // Grid: rows[day-of-week][week-index] = level. -1 = blank.
  // Three classes of blank cells:
  //  - Days before windowStart (e.g. Dec pad-out for year-filtered view)
  //  - Days after windowEnd (only for unfiltered; year-filtered goes to Dec 31)
  //  - Days past today (future cells, when year-filtered shows current year)
  // Cells inside the window with no submission data render as level 0.
  const grid: CellLevel[][] = Array.from({ length: 7 }, () =>
    new Array<CellLevel>(totalWeeks).fill(-1),
  );
  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(renderStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      if (
        cellDate < windowStart ||
        cellDate > windowEnd ||
        cellDate > today // future days never show as data, even with 0
      ) {
        grid[d][w] = -1;
        continue;
      }
      const iso = formatLocalIso(cellDate);
      const count = byDate.get(iso) ?? 0;
      grid[d][w] = levelFor(count);
    }
  }

  // Map each level to the glyph it renders as.
  const GLYPH: Record<CellLevel, string> = {
    [-1]: "\u00A0", // non-breaking space — still claims width when wrapped in <span>
    0: "·",
    1: "░",
    2: "▒",
    3: "▓",
    4: "█",
  };

  // Build month-label row. For each column, find the FIRST non-blank day
  // in that column (Sun → Sat). The label uses that day's month — this
  // way a week that straddles Dec 28 → Jan 3 (where Dec days are blank
  // pad-out for a year-filtered view) gets labelled "Jan" based on the
  // first real cell.
  const monthLabel = new Array(totalWeeks).fill("");
  let prevMonth = -1;
  let lastLabelWeek = -10;
  for (let w = 0; w < totalWeeks; w++) {
    // Find the first non-blank day's date in this column.
    let firstRealDate: Date | null = null;
    for (let d = 0; d < 7; d++) {
      if (grid[d][w] !== -1) {
        const cd = new Date(renderStart);
        cd.setDate(cd.getDate() + w * 7 + d);
        firstRealDate = cd;
        break;
      }
    }
    if (!firstRealDate) continue; // entire column is blank — skip

    const m = firstRealDate.getMonth();
    if (m !== prevMonth) {
      // Adjacent-label spacing guard: don't write two labels within 2
      // weeks of each other.
      if (w - lastLabelWeek >= 2) {
        monthLabel[w] = firstRealDate
          .toLocaleString(undefined, { month: "short" })
          .slice(0, 3);
        lastLabelWeek = w;
      }
      prevMonth = m;
    }
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totalCount = filtered.reduce((s, d) => s + d.count, 0);
  const activeDays = filtered.filter((d) => d.count > 0).length;

  return (
    <div style={{ margin: "8px 0" }}>
      {/* ── YEAR BANNER ──
       * A structural divider with the year drawn into the rule itself. This
       * makes the heatmap's year unmistakable when scrolling through multiple
       * years in the scrollback — was the main complaint about the previous
       * pass (every year's grid looked identical without the banner). */}
      {effectiveYear && (
        <div
          style={{
            fontFamily: "var(--t-font-mono), monospace",
            fontSize: 13,
            color: "var(--t-accent)",
            marginBottom: 6,
            letterSpacing: "0.05em",
            textShadow: "0 0 4px var(--t-accent-dim)",
          }}
        >
          {"── "}
          <span style={{ fontWeight: 700 }}>{effectiveYear}</span>
          {" ──"}
          <span className={styles.dim} style={{ fontWeight: 400 }}>
            {" "}
            {totalCount} contributions · {activeDays} active days
          </span>
        </div>
      )}

      {/* ── YEAR SELECTOR TABS ──
       * Clickable in the UI; typing the equivalent command (`cf 2024`)
       * still works for keyboard purists. Inactive years are styled like
       * dimmed terminal hyperlinks so they read as interactive. */}
      {availableYears && availableYears.length > 1 && (
        <div
          className={styles.dim}
          style={{ fontSize: 11, marginBottom: 6 }}
        >
          <span style={{ marginRight: 8 }}>year:</span>
          {availableYears.map((y, i) => {
            const isActive = y === effectiveYear;
            return (
              <span key={y}>
                {i > 0 && (
                  <span style={{ color: "var(--t-subtle)" }}>{" · "}</span>
                )}
                {isActive ? (
                  <span
                    className={styles.accent}
                    style={{ fontWeight: 700 }}
                  >
                    [{y}]
                  </span>
                ) : onYearClick ? (
                  // Use a real <button> rendered like inline text so screen
                  // readers/keyboard nav work; styles strip the button
                  // chrome. Cursor goes pointer on hover.
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onYearClick(y);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      color: "var(--t-accent)",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                      textDecorationThickness: 1,
                    }}
                    aria-label={`Switch to ${y}${commandPrefix ? ` (${commandPrefix} ${y})` : ""}`}
                  >
                    {y}
                  </button>
                ) : (
                  <span style={{ color: "var(--t-accent)" }}>{y}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Layout: a CSS grid where the first column is the day-of-week label
       * (fixed 2.5em wide) and the remaining `totalWeeks` columns each take
       * an equal share of the remaining horizontal space. This fills the
       * available area instead of using fixed-width cells — important for
       * year-filtered views where the grid would otherwise look orphaned
       * in a large container. minmax(0, 1fr) lets columns shrink below
       * their content if the container gets very narrow. */}
      <div
        style={{
          fontFamily: "var(--t-font-mono), monospace",
          fontSize: 11,
          lineHeight: 1.5,
          margin: 0,
          color: "var(--t-accent)",
          textShadow: "0 0 2px var(--t-accent-dim)",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {/* Build a shared grid-template so the month-label row, day rows,
            and legend all line up to the same columns. The first column is
            the day label slot. */}
        {(() => {
          const gridTemplate = `2.5em repeat(${totalWeeks}, minmax(8px, 1fr))`;
          return (
            <>
              {/* Month-label row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: gridTemplate,
                  columnGap: 0,
                  marginBottom: 2,
                }}
              >
                <span />
                {monthLabel.map((m, i) => (
                  <span
                    key={i}
                    style={{
                      color: "var(--t-muted)",
                      // Labels overflow into adjacent columns so we can
                      // show "Jan" on a single-cell-wide column. text-align
                      // left so the label sits flush with its month-start
                      // column.
                      whiteSpace: "nowrap",
                      overflow: "visible",
                      textAlign: "left",
                    }}
                  >
                    {m || "\u00A0"}
                  </span>
                ))}
              </div>

              {/* Day rows */}
              {grid.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridTemplate,
                    columnGap: 0,
                  }}
                >
                  <span style={{ color: "var(--t-muted)" }}>{dayLabels[i]}</span>
                  {row.map((level, j) => (
                    <span
                      key={j}
                      style={{
                        textAlign: "center",
                        color:
                          level === -1
                            ? "transparent"
                            : level === 0
                              ? "var(--t-subtle)"
                              : "var(--t-accent)",
                      }}
                    >
                      {GLYPH[level]}
                    </span>
                  ))}
                </div>
              ))}

              {/* Legend */}
              <div
                style={{
                  color: "var(--t-muted)",
                  marginTop: 6,
                  fontSize: 10,
                  paddingLeft: "2.5em",
                }}
              >
                less · ░ ▒ ▓ █ more
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ─── ASCII line chart ──────────────────────────────────────────────
 * True line chart (NOT an area chart) rendered with Braille unicode
 * characters. Each Braille glyph encodes 2×4 = 8 sub-pixel dots, so a
 * single character of horizontal space gives us 2 columns of resolution
 * and 4 rows of vertical resolution. Result: smooth curves at terminal
 * grain — what real CLI tools (btop, gtop) use.
 *
 * Layout: a fixed-width 7-row chart. Each row is rendered as a string of
 * Braille glyphs. For a given column we calculate the curve's y-value, find
 * which row it falls in, and set the corresponding sub-dot. Below the
 * curve we leave empty (no fill) — that's what makes it a LINE chart
 * rather than an area chart.
 *
 * A subtle baseline grid runs through the chart at the min/mid/max rows
 * — gives the eye anchors without competing with the curve itself.
 */
function AsciiLineChart({
  points,
  label,
  width = 60,
  rows = 7,
}: {
  points: Array<{ t: number; v: number }>;
  label?: string;
  width?: number;
  rows?: number;
}) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.t - b.t);
  const tMin = sorted[0].t;
  const tMax = sorted[sorted.length - 1].t;
  const vMin = Math.min(...sorted.map((p) => p.v));
  const vMax = Math.max(...sorted.map((p) => p.v));
  const tSpan = tMax - tMin || 1;
  const vSpan = vMax - vMin || 1;

  // Each Braille cell has 2 horizontal dots × 4 vertical dots.
  // So our internal sub-pixel grid is (width * 2) × (rows * 4).
  const cellsW = width;
  const cellsH = rows;
  const subW = cellsW * 2;
  const subH = cellsH * 4;

  // Sample the curve at every sub-pixel column. We could sample once per
  // Braille cell, but two samples per cell gives smoother diagonals.
  // Linear interpolation between known points for inter-point smoothness.
  const ys = new Array(subW).fill(-1);
  for (let x = 0; x < subW; x++) {
    const t = tMin + (x / (subW - 1)) * tSpan;
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].t < t) lo = mid;
      else hi = mid;
    }
    const a = sorted[lo];
    const b = sorted[hi];
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    const v = a.v + (b.v - a.v) * f;
    // Map v to a sub-pixel row, with 0=top, (subH-1)=bottom.
    const y = Math.round((1 - (v - vMin) / vSpan) * (subH - 1));
    ys[x] = Math.max(0, Math.min(subH - 1, y));
  }

  // Connect adjacent samples with vertical lines so the curve doesn't
  // break into disconnected dots when the slope is steep. For each pair
  // of adjacent sub-pixel x positions, fill every sub-pixel y between
  // them. This is the standard trick for terminal sparklines.
  const grid: boolean[][] = Array.from({ length: subH }, () =>
    new Array(subW).fill(false),
  );
  for (let x = 0; x < subW; x++) {
    grid[ys[x]][x] = true;
    if (x > 0) {
      const y0 = ys[x - 1];
      const y1 = ys[x];
      const [from, to] = y0 < y1 ? [y0, y1] : [y1, y0];
      for (let y = from; y <= to; y++) grid[y][x] = true;
    }
  }

  // Braille base codepoint is U+2800. Sub-dot layout within a single cell:
  //   1 4
  //   2 5
  //   3 6
  //   7 8
  // The numeric weight for each (dx, dy) within the 2×4 cell is:
  //   const W = [[0x1, 0x8], [0x2, 0x10], [0x4, 0x20], [0x40, 0x80]];
  // dx is the column offset (0 or 1), dy is the row offset within the cell (0..3).
  const BRAILLE_BASE = 0x2800;
  const DOT = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
  ] as const;

  const lines: string[] = [];
  for (let r = 0; r < cellsH; r++) {
    let line = "";
    for (let c = 0; c < cellsW; c++) {
      let glyph = BRAILLE_BASE;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const subY = r * 4 + dy;
          const subX = c * 2 + dx;
          if (grid[subY] && grid[subY][subX]) {
            glyph |= DOT[dy][dx];
          }
        }
      }
      line += String.fromCharCode(glyph);
    }
    lines.push(line);
  }

  // Y-axis labels rendered to the left of each row.
  // - top row: max value
  // - bottom row: min value
  // - middle row: midpoint value
  // - other rows: blank (keeps things uncluttered)
  const labelFor = (r: number): string => {
    if (r === 0) return String(Math.round(vMax)).padStart(5);
    if (r === cellsH - 1) return String(Math.round(vMin)).padStart(5);
    if (r === Math.floor(cellsH / 2)) {
      return String(Math.round((vMin + vMax) / 2)).padStart(5);
    }
    return "     ";
  };

  // X-axis: show the date range below the chart.
  const dateRange = (() => {
    // tMin/tMax are unix seconds OR ms — normalize to ms by checking magnitude
    const toDate = (t: number) =>
      new Date(t < 1e12 ? t * 1000 : t).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      });
    return `${toDate(tMin)} → ${toDate(tMax)}`;
  })();

  return (
    <div style={{ margin: "4px 0" }}>
      {label && (
        <div className={styles.dim} style={{ fontSize: 11, marginBottom: 4 }}>
          {label} · min {Math.round(vMin)} · max {Math.round(vMax)}
        </div>
      )}
      <pre
        style={{
          fontFamily: "var(--t-font-mono), monospace",
          fontSize: 13,
          lineHeight: 1.0,
          margin: 0,
          color: "var(--t-accent)",
          textShadow: "0 0 3px var(--t-accent-dim)",
          overflowX: "auto",
          maxWidth: "100%",
        }}
      >
        {lines.map((row, i) => (
          <div key={i}>
            <span
              className={styles.dim}
              style={{ marginRight: 6, fontSize: 11 }}
            >
              {labelFor(i)}
            </span>
            {row}
          </div>
        ))}
        <div
          className={styles.dim}
          style={{ fontSize: 10, marginTop: 4, paddingLeft: 44 }}
        >
          {dateRange}
        </div>
      </pre>
    </div>
  );
}

/* ─── Cloudinary URL helper (avoid full import chain) ─────────────────
 * Constructs a delivery URL for a Cloudinary publicId. Mirrors the shape of
 * @/lib/cloudinary-url's deriveUrl but inlined here to keep the terminal
 * template fully self-contained — one less cross-module dependency.
 */
function deriveCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw",
): string {
  // process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD is set at build time; if missing
  // we fall back to the cloud name embedded in publicId-prefixed URLs, but
  // that's a rare case. In dev the env var is always present.
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
    "demo";
  return `https://res.cloudinary.com/${cloud}/${resourceType}/upload/${publicId}`;
}

/* ─── Local-time date helpers ──────────────────────────────────────────
 * We avoid Date.toISOString() and `new Date(yyyy-mm-dd)` for portfolio dates
 * because those operate in UTC. For a user in IST (+5:30), `new Date("2024-05-15")`
 * yields midnight UTC, which is 05:30 local on May 15 — fine on its own,
 * but when we then go cellDate.toISOString().slice(0,10) we get back "2024-05-15"
 * only at the start of the day. Subtle off-by-one bugs creep in when local
 * dates straddle midnight UTC. These helpers anchor everything to local time.
 */

function parseLocalDate(iso: string): Date {
  // Parse "YYYY-MM-DD" as a LOCAL date at midnight (not UTC midnight).
  // `new Date("2024-05-15")` is UTC; `new Date(2024, 4, 15)` is local.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalIso(d: Date): string {
  // Format a Date back to "YYYY-MM-DD" using its LOCAL components, matching
  // the date strings the data layer hands us. Avoids the UTC drift that
  // toISOString() introduces.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}