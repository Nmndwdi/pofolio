import SettingsNav from "./SettingsNav";

/*
 * Settings shell. The dashboard layout one level up handles auth gating
 * and the global header (logo, sign out, etc.). This layout adds the
 * settings-specific sidebar nav.
 *
 * Three sections, listed in order of how often a user visits them:
 *   - Profile: rename slug, display name (most common edit)
 *   - Account: change password (occasional)
 *   - Danger: delete account (rare, intentionally last)
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-[180px_1fr]">
      <aside>
        <SettingsNav />
      </aside>
      <div>{children}</div>
    </div>
  );
}
