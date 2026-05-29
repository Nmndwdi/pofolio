"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/danger", label: "Danger zone" },
];

/*
 * Sidebar nav for settings. Highlights the active route so the user always
 * knows where they are. Client component because we read the pathname.
 *
 * Exact match for /settings to avoid /settings/account showing both
 * "Profile" and "Account" as active.
 */
export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          // Allow /settings/account/* etc. to highlight the parent
          (item.href !== "/settings" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
