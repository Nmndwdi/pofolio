/*
 * Resume parsing — interface and result types.
 *
 * The whole point of this file: nothing upstream (API route, editor) should
 * know HOW a resume is parsed. They depend only on `ResumeParser` and
 * `ParsedResume`. Today the implementation is heuristic/pure-code; swapping
 * in an LLM-based one later means changing one line in index.ts and nothing
 * else.
 *
 * `ParsedResume` is deliberately a "best effort" shape — every field is
 * optional because no parser, heuristic or LLM, extracts everything reliably.
 * The editor treats these as pre-fill suggestions the user reviews and
 * corrects, never as authoritative data.
 */

/** A single work-experience entry. */
export interface ParsedExperience {
  company?: string;
  role?: string;
  /** Free-text date range as it appeared, e.g. "Jun 2023 – Present". */
  dates?: string;
  /** One or two lines describing the role. NOT a bullet list. */
  summary?: string;
}

/** A single education entry. */
export interface ParsedEducation {
  institution?: string;
  /** e.g. "B.Tech, Computer Science". */
  degree?: string;
  dates?: string;
}

/**
 * The full parsed result. Every field optional — a parser fills in what it
 * can find and leaves the rest undefined.
 */
export interface ParsedResume {
  // Identity
  name?: string;
  email?: string;
  phone?: string;

  // Links found anywhere in the text
  linkedinUrl?: string;
  githubUrl?: string;
  /** GitHub username extracted from the URL, if any — convenient for the form. */
  githubHandle?: string;
  websiteUrl?: string;

  // Structured sections
  experience: ParsedExperience[];
  education: ParsedEducation[];
  skills: string[];

  /**
   * Parser-reported confidence, 0–1. Heuristic parsers set this lower; an
   * LLM parser would set it higher. The editor can use it to decide how
   * loudly to prompt the user to review (low confidence → bigger banner).
   */
  confidence: number;

  /**
   * Which implementation produced this result. Useful for debugging and for
   * the editor to show "parsed with X" if we ever want to.
   */
  parser: "heuristic" | "llm";
}

/**
 * The contract every resume parser implements.
 *
 * Input is the raw PDF bytes. Output is a best-effort ParsedResume.
 * Implementations should NOT throw for "couldn't parse well" — they should
 * return a ParsedResume with low confidence and whatever fields they managed.
 * They may throw only for genuine failures (corrupt file, unreadable PDF).
 */
export interface ResumeParser {
  parse(pdfBytes: Buffer | Uint8Array): Promise<ParsedResume>;
}

/** An empty result — used as a base that parsers fill in. */
export function emptyParsedResume(parser: ParsedResume["parser"]): ParsedResume {
  return {
    experience: [],
    education: [],
    skills: [],
    confidence: 0,
    parser,
  };
}
