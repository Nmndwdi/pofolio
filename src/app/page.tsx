import Link from "next/link";
import { auth } from "@/lib/auth";
import { QRSculptureClient } from "@/components/qr/QRSculptureClient";

/*
 * Landing page.
 *
 * Aesthetic direction: editorial / printed-card. Serif display type, warm
 * off-white background, single anchored 3D sculpture floating top-right.
 * The page reads more like a magazine spread than a SaaS hero.
 *
 * Why this commits to a direction:
 *   - Serif headline distinguishes from every Linktree-clone landing page
 *   - Warm paper background (not pure white) gives "artifact" feeling
 *   - Asymmetric layout — text left-aligned, sculpture right-aligned —
 *     instead of the standard centered-hero pattern
 *   - One ink-red accent used sparingly (the QR sculpture is dark, the
 *     primary button is the red — they draw the two key gazes)
 *
 * The 3D sculpture's lazy-load lives in QRSculptureClient (a Client
 * Component) — Next 16 forbids `next/dynamic` with ssr:false in Server
 * Components, and this page is a Server Component.
 */

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="paper-bg min-h-screen text-ink">
      {/* Top bar — kept very thin and off to the sides */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8 sm:px-10">
        <span className="font-serif text-2xl tracking-tight">
          Pofolio<span className="text-ink-accent">.</span>
        </span>
        <nav className="flex items-center gap-5 text-sm">
          {session?.user ? (
            <Link href="/dashboard" className="hover:underline underline-offset-4">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-ink/70 hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-ink-accent px-4 py-1.5 text-sm text-paper transition-colors hover:bg-ink"
              >
                Get yours
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          {/* ─── Editorial left column ────────────────────────────────── */}
          <div className="max-w-xl">
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-ink/60">
              for students, devs, and the soon-to-be-hired
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.5rem]">
              Your portfolio,{" "}
              <span className="italic text-ink-accent">always live.</span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-ink/75">
              One short URL, a single page, kept current automatically. Drop your
              GitHub username and we&apos;ll show your latest repos. Add a
              LeetCode handle and your solved-count appears. Update your work in
              the world; your page updates by itself.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-accent"
                >
                  Go to your dashboard →
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-accent"
                >
                  Claim your URL →
                </Link>
              )}
              <span className="font-mono text-sm text-ink/50">
                pofolio.live/p/<span className="text-ink/80">yourname</span>
              </span>
            </div>
          </div>

          {/* ─── Sculpture column ─────────────────────────────────────── */}
          <div className="relative h-[320px] sm:h-[420px] lg:h-[480px]">
            <QRSculptureClient />
          </div>
        </div>

        {/* ─── Below-the-fold: three-column "what you get" ──────────── */}
        <section className="mt-32 grid gap-12 border-t border-ink/10 pt-16 sm:grid-cols-3">
          <Feature
            number="01"
            title="One URL, forever"
            body="Your handle is yours. Pofolio.live/p/yourname goes on your resume header, your email signature, your LinkedIn — once, then you forget about it."
          />
          <Feature
            number="02"
            title="Live, by default"
            body="Stats from GitHub, Codeforces, LeetCode pull on every visit. New repo? It shows up. New rating? It updates. You don't lift a finger."
          />
          <Feature
            number="03"
            title="Built-in, not built"
            body="Fill a form: name, headline, a few links, optionally a resume PDF. Skip the weekend you'd spend deploying a Next.js portfolio yourself."
          />
        </section>

        {/* ─── Specimen URL row ─────────────────────────────────────── */}
        <section className="mt-24 rounded-2xl border border-ink/10 bg-paper-card p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/60">
            specimen
          </p>
          <p className="mt-4 font-serif text-3xl italic text-ink/90 sm:text-4xl">
            &ldquo;pofolio.live/p/&rdquo;
          </p>
          <p className="mt-4 max-w-md mx-auto text-sm text-ink/60">
            Short enough to type, distinctive enough to remember. Yours
            permanently — until you change it.
          </p>
        </section>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        <footer className="mt-24 flex items-center justify-between border-t border-ink/10 pt-8 text-xs text-ink/50">
          <span>© Pofolio {new Date().getFullYear()}</span>
          <span className="font-mono">v0.1</span>
        </footer>
      </main>
    </div>
  );
}

function Feature({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="font-mono text-xs text-ink/40">{number}</span>
      <h3 className="mt-2 font-serif text-2xl tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">{body}</p>
    </div>
  );
}
