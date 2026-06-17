# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Pofolio, **please report it privately**. Public issue reports for security problems give attackers a roadmap before users can patch.

### How to report

Email the maintainer at **nmndwdi1001@gmail.com**

Include:

- A description of the vulnerability
- Steps to reproduce
- Affected version(s) / commit SHA
- Your assessment of impact (data leak, RCE, auth bypass, etc.)
- Any proof-of-concept code

### What to expect

- **Acknowledgment** within 72 hours
- **Triage and severity assessment** within 7 days
- **Fix timeline** communicated based on severity:
  - Critical (RCE, auth bypass, data leak): patched within 7 days, coordinated disclosure
  - High: patched within 30 days
  - Medium / Low: patched in the next regular release
- **Public disclosure** via GitHub Security Advisory after the fix ships

### Recognition

Researchers who report valid vulnerabilities are credited in the security advisory (unless they prefer to remain anonymous).

## Supported Versions

Only the latest tagged release on `main` is supported with security fixes. Forks are responsible for their own backports.

| Version | Supported          |
| ------- | ------------------ |
| Latest `main` | :white_check_mark: |
| Older tags    | :x:                |

## Out of Scope

The following are explicitly out of scope for security reports:

- Vulnerabilities in third-party services (Cloudinary, MongoDB Atlas, Vercel) — report directly to the vendor
- Denial of service via excessive resource consumption on free tiers
- Self-XSS that requires victim to paste code into their own console
- Missing security headers without a demonstrated attack
- Issues in dependencies already disclosed and pending upstream fix

Thanks for helping keep Pofolio users safe.
