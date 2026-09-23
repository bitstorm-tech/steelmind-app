// Directive text processing: tokenize a directive into keyword and plain
// text segments (SPEC §50 keywords, §51 keyword highlighting behavior).
// Keywords are matched case-sensitively — uppercase is the game's keyword
// notation, lowercase prose stays plain.

import { GAMEPLAY_KEYWORDS } from "./brains";
import type { GameplayKeyword } from "./brains";

export interface DirectiveToken {
  text: string;
  keyword: boolean;
}

// Longest first so overlapping keywords can never shadow each other.
const KEYWORD_PATTERN = new RegExp(
  `\\b(${[...GAMEPLAY_KEYWORDS].sort((a, b) => b.length - a.length).join("|")})\\b`,
  "g",
);

export function tokenizeDirective(text: string): DirectiveToken[] {
  const tokens: DirectiveToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(KEYWORD_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ text: text.slice(cursor, index), keyword: false });
    }
    tokens.push({ text: match[0], keyword: true });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), keyword: false });
  }

  return tokens;
}

export function extractKeywords(text: string): GameplayKeyword[] {
  return tokenizeDirective(text)
    .filter((token) => token.keyword)
    .map((token) => token.text as GameplayKeyword);
}

export function directiveHasKeyword(text: string): boolean {
  return extractKeywords(text).length > 0;
}
