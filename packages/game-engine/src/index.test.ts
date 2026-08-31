import { describe, expect, test } from "bun:test";
import { PACKAGE_NAME } from "./index";

describe("game-engine", () => {
  test("package loads", () => {
    expect(PACKAGE_NAME).toBe("@steelmind/game-engine");
  });
});
