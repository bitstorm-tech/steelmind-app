import { describe, expect, test } from "vitest";
import { directiveHasKeyword, extractKeywords, tokenizeDirective } from "./keywords";

describe("directive keywords", () => {
  test("tokenizes keywords and plain text without losing content", () => {
    const text = "Preserve ENERGY and use CHARGE only when necessary.";
    const tokens = tokenizeDirective(text);

    expect(tokens.map((t) => t.text).join("")).toBe(text);
    expect(tokens.filter((t) => t.keyword).map((t) => t.text)).toEqual([
      "ENERGY",
      "CHARGE",
    ]);
  });

  test("keywords are case-sensitive", () => {
    expect(extractKeywords("preserve energy and charge carefully")).toEqual([]);
    expect(extractKeywords("preserve ENERGY and CHARGE carefully")).toEqual([
      "ENERGY",
      "CHARGE",
    ]);
  });

  test("does not match keywords inside other words", () => {
    expect(extractKeywords("Roundhouse the enemy")).toEqual([]);
    expect(extractKeywords("HEADPHONES stay plain")).toEqual([]);
    expect(extractKeywords("the HP")).toEqual(["HP"]);
  });

  test("distinguishes underscore keywords", () => {
    expect(extractKeywords("MELEE_ATTACK and MELEE_WEAPON differ")).toEqual([
      "MELEE_ATTACK",
      "MELEE_WEAPON",
    ]);
  });

  test("rejects directives without keywords (SPEC §51)", () => {
    expect(directiveHasKeyword("Fight intelligently and make clever decisions.")).toBe(
      false,
    );
    expect(directiveHasKeyword("Preserve ENERGY and use CHARGE only when necessary.")).toBe(
      true,
    );
  });
});
