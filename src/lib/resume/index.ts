import type { ResumeParser } from "./types";
import { HeuristicResumeParser } from "./heuristic-parser";

/*
 * Resume parser selection.
 *
 * THIS IS THE SWAP POINT. To move from heuristic to LLM-based parsing:
 *   1. Implement LLMResumeParser (same ResumeParser interface)
 *   2. Change the line below to `new LLMResumeParser()`
 *   3. Nothing else changes — the API route and editor only know the interface
 *
 * Could also be made env-driven (e.g. RESUME_PARSER=llm picks the LLM one),
 * which is worth doing once a second implementation exists. For now there's
 * one implementation, so a plain constant is honest about reality.
 */

export const resumeParser: ResumeParser = new HeuristicResumeParser();

// Re-export types so callers import everything from "@/lib/resume".
export type {
  ResumeParser,
  ParsedResume,
  ParsedExperience,
  ParsedEducation,
} from "./types";
