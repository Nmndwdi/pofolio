import { PDFParse } from "pdf-parse";
import {
  type ResumeParser,
  type ParsedResume,
  type ParsedExperience,
  type ParsedEducation,
  emptyParsedResume,
} from "./types";

/*
 * Heuristic resume parser.
 *
 * Strategy: extract raw text with pdf-parse, then apply pattern matching.
 *
 * Honest about limitations:
 *   - Works well on conventional single-column resumes with standard section
 *     headings ("Experience", "Education", "Skills").
 *   - Two-column layouts: pdf-parse linearizes text in reading order, which
 *     for two-column PDFs can interleave columns badly. Those resumes parse
 *     poorly. The user reviews everything, so it's a degraded experience,
 *     not a broken one.
 *   - Confidence is reported conservatively (max ~0.7) so the editor prompts
 *     the user to review carefully.
 *
 * Everything here is pattern-matching with no external calls — fast, free,
 * offline. When the LLM parser is added, it implements the same ResumeParser
 * interface and this file is untouched.
 */

// ─── Patterns ───────────────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
// Phone: loose — international prefixes, separators, parens. Resume phones
// vary wildly; we accept a broad shape and trust the user to fix it.
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/?/i;
// Generic website — http(s) URL that isn't linkedin/github.
const URL_RE = /https?:\/\/[^\s)]+/gi;

// Section headings we look for. Case-insensitive, must be on their own line
// (possibly with trailing colon). Order doesn't matter — we scan for all.
const SECTION_HEADINGS = {
  experience: /^(work\s+)?experience$|^employment$|^professional\s+experience$/i,
  education: /^education$|^academic(s)?$/i,
  skills: /^(technical\s+)?skills$|^skills\s*&?\s*(tools|technologies)?$/i,
};

// Date-range fragment, e.g. "Jun 2023 – Present", "2021 - 2023", "08/2022 – 05/2024".
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-1]?\d\/)[a-z]*\.?\s*\d{4}|\b\d{4}\b)\s*[–\-—to]+\s*((?:present|current|now)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-1]?\d\/)[a-z]*\.?\s*\d{4}|\b\d{4}\b)/i;

// ─── Implementation ─────────────────────────────────────────────────────────

export class HeuristicResumeParser implements ResumeParser {
  async parse(pdfBytes: Buffer | Uint8Array): Promise<ParsedResume> {
    const result = emptyParsedResume("heuristic");

    // 1. Extract text. pdf-parse v2 wants a Uint8Array-ish `data`.
    let text: string;
    try {
      const parser = new PDFParse({
        data: pdfBytes instanceof Buffer ? new Uint8Array(pdfBytes) : pdfBytes,
      });
      const out = await parser.getText();
      text = out.text ?? "";
    } catch (err) {
      // Genuine failure — corrupt or unreadable PDF. Surface it.
      throw new Error(
        `Couldn't read the PDF: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    if (!text.trim()) {
      // PDF had no extractable text — likely a scanned image. Return empty
      // with zero confidence rather than throwing; the editor will tell the
      // user nothing could be extracted.
      return result;
    }

    // Normalize: split into trimmed non-empty lines, keep a flat version too.
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const flat = lines.join("\n");

    // 2. Contact fields — scan the whole text.
    result.email = EMAIL_RE.exec(flat)?.[0];

    const phoneMatch = PHONE_RE.exec(flat)?.[0]?.trim();
    // Guard: the phone regex is loose enough to catch things like years or
    // ID numbers. Require at least 8 digits to count it as a phone.
    if (phoneMatch && (phoneMatch.replace(/\D/g, "").length >= 8)) {
      result.phone = phoneMatch;
    }

    const linkedin = LINKEDIN_RE.exec(flat)?.[0];
    if (linkedin) {
      result.linkedinUrl = linkedin.startsWith("http")
        ? linkedin
        : `https://${linkedin}`;
    }

    const githubMatch = GITHUB_RE.exec(flat);
    if (githubMatch) {
      const handle = githubMatch[1];
      // Skip github.com/ paths that aren't user profiles (e.g. github.com/orgs)
      if (handle && !["orgs", "topics", "sponsors"].includes(handle.toLowerCase())) {
        result.githubHandle = handle;
        result.githubUrl = `https://github.com/${handle}`;
      }
    }

    // Website: first http URL that isn't linkedin or github.
    const allUrls = flat.match(URL_RE) ?? [];
    const website = allUrls.find(
      (u) => !/linkedin\.com|github\.com/i.test(u),
    );
    if (website) {
      // Strip trailing punctuation that often clings to URLs in text.
      result.websiteUrl = website.replace(/[.,;)]+$/, "");
    }

    // 3. Name — heuristic: usually the first substantial line, before any
    //    contact info. We take the first line that:
    //      - has 2–4 words
    //      - is not an email/phone/url
    //      - is mostly letters
    result.name = guessName(lines);

    // 4. Sectioned content. Find heading line indices, slice between them.
    const sections = sliceSections(lines);
    if (sections.experience) {
      result.experience = parseExperience(sections.experience);
    }
    if (sections.education) {
      result.education = parseEducation(sections.education);
    }
    if (sections.skills) {
      result.skills = parseSkills(sections.skills);
    }

    // 5. Confidence — a rough function of how much we found. Heuristic
    //    parsing never claims high confidence; max out around 0.7.
    result.confidence = computeConfidence(result);

    return result;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function guessName(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 6)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || /https?:\/\//.test(line)) {
      continue;
    }
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    // Mostly alphabetic (allow hyphens, apostrophes, periods for initials)
    const lettersOnly = line.replace(/[^A-Za-z]/g, "");
    if (lettersOnly.length < line.replace(/\s/g, "").length * 0.7) continue;
    // Avoid all-caps section headings being mistaken for a name is fine —
    // names are often capitalized too. But skip lines that are clearly
    // headings.
    if (/^(resume|curriculum\s+vitae|cv)$/i.test(line)) continue;
    return line;
  }
  return undefined;
}

/**
 * Find section headings and return the lines belonging to each section
 * (everything between this heading and the next recognized heading).
 */
function sliceSections(lines: string[]): {
  experience?: string[];
  education?: string[];
  skills?: string[];
} {
  // Record (index, sectionName) for every line that is a known heading.
  const marks: Array<{ idx: number; key: keyof typeof SECTION_HEADINGS }> = [];
  lines.forEach((line, idx) => {
    for (const [key, re] of Object.entries(SECTION_HEADINGS)) {
      if (re.test(line)) {
        marks.push({ idx, key: key as keyof typeof SECTION_HEADINGS });
        break;
      }
    }
  });

  if (marks.length === 0) return {};

  // Sort by position, then each section runs until the next mark.
  marks.sort((a, b) => a.idx - b.idx);
  const out: Record<string, string[]> = {};
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].idx + 1;
    const end = i + 1 < marks.length ? marks[i + 1].idx : lines.length;
    out[marks[i].key] = lines.slice(start, end);
  }
  return out;
}

/**
 * Parse an experience section. We look for date-range lines as anchors —
 * each date range typically marks one job. The lines around it carry the
 * company and role.
 */
function parseExperience(sectionLines: string[]): ParsedExperience[] {
  const entries: ParsedExperience[] = [];

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const dateMatch = DATE_RANGE_RE.exec(line);
    if (!dateMatch) continue;

    // The date line itself often also contains the company or role.
    // Lines immediately before/after carry the rest. We take a small window.
    const dates = dateMatch[0];
    const beforeLine = i > 0 ? sectionLines[i - 1] : "";
    const afterLine = i + 1 < sectionLines.length ? sectionLines[i + 1] : "";

    // The text on the date line minus the date itself — often "Company" or
    // "Role — Company".
    const dateLineRest = line.replace(dateMatch[0], "").replace(/[|·•—-]\s*$/, "").trim();

    // Heuristic assignment: the line before a date line is usually the role
    // or company; we put the most substantial nearby line as role and the
    // date-line remainder as company. This is rough — user corrects it.
    const entry: ParsedExperience = { dates };
    if (dateLineRest) {
      entry.company = dateLineRest;
    }
    if (beforeLine && !DATE_RANGE_RE.test(beforeLine)) {
      entry.role = beforeLine;
    }
    // A non-bullet line after is treated as the summary.
    if (
      afterLine &&
      !DATE_RANGE_RE.test(afterLine) &&
      afterLine.length > 20
    ) {
      entry.summary = afterLine.replace(/^[•·\-*]\s*/, "");
    }

    entries.push(entry);
  }

  // Cap at 8 — more than that and the parsing is probably picking up noise.
  return entries.slice(0, 8);
}

/**
 * Parse an education section. Look for lines mentioning a degree keyword or
 * a year; pair them up loosely.
 */
function parseEducation(sectionLines: string[]): ParsedEducation[] {
  const DEGREE_RE =
    /\b(b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?sc|m\.?sc|bachelor|master|ph\.?d|diploma|b\.?a\.?|m\.?a\.?|mba|bca|mca)\b/i;
  const entries: ParsedEducation[] = [];

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (!DEGREE_RE.test(line) && !/\b(19|20)\d{2}\b/.test(line)) continue;

    const entry: ParsedEducation = {};
    const dateMatch =
      DATE_RANGE_RE.exec(line) ?? /\b(19|20)\d{2}\b/.exec(line);
    if (dateMatch) entry.dates = dateMatch[0];

    if (DEGREE_RE.test(line)) {
      entry.degree = line.replace(dateMatch?.[0] ?? "", "").replace(/[|·•]/g, "").trim();
      // Institution is often the line just above.
      const above = i > 0 ? sectionLines[i - 1] : "";
      if (above && !DEGREE_RE.test(above)) entry.institution = above;
    } else {
      // Line had only a year — treat the whole thing as institution.
      entry.institution = line.replace(dateMatch?.[0] ?? "", "").trim();
    }

    // Skip empty-ish entries
    if (entry.degree || entry.institution) entries.push(entry);
  }

  return entries.slice(0, 5);
}

/**
 * Parse a skills section. Skills are usually comma/bullet/pipe separated,
 * sometimes grouped by category ("Languages: Java, Python"). We flatten:
 * strip any "Category:" prefix, then split on common separators.
 */
function parseSkills(sectionLines: string[]): string[] {
  const skills = new Set<string>();

  for (const line of sectionLines) {
    // Drop a leading "Category:" label if present.
    const withoutLabel = line.replace(/^[A-Za-z\s&/]+:\s*/, "");
    // Split on commas, bullets, pipes, slashes-with-spaces.
    const parts = withoutLabel.split(/[,•·|]|\s•\s|\s\/\s/);
    for (const raw of parts) {
      const skill = raw.trim().replace(/[.;]+$/, "");
      // Reasonable skill length — drop empties and sentence-like fragments.
      if (skill.length >= 1 && skill.length <= 30 && skill.split(/\s+/).length <= 4) {
        skills.add(skill);
      }
    }
  }

  // Cap at 40 — beyond that it's noise.
  return [...skills].slice(0, 40);
}

function computeConfidence(r: ParsedResume): number {
  // Each found field nudges confidence up. Heuristic parsing tops out at
  // ~0.7 — we never claim certainty because layout variance is real.
  let score = 0;
  if (r.name) score += 0.15;
  if (r.email) score += 0.15;
  if (r.linkedinUrl || r.githubUrl) score += 0.1;
  if (r.experience.length > 0) score += 0.15;
  if (r.education.length > 0) score += 0.1;
  if (r.skills.length > 0) score += 0.05;
  return Math.min(0.7, score);
}
