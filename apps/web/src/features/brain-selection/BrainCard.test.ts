import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import BrainCard from "./BrainCard.vue";
import { STARTER_BRAINS } from "./brains";

const berserker = STARTER_BRAINS[0]!;

describe("BrainCard", () => {
  test("renders the full firmware dump", () => {
    const wrapper = mount(BrainCard, {
      props: { brain: berserker, selected: false },
    });

    expect(wrapper.text()).toContain("BRN-01");
    expect(wrapper.text()).toContain("Berserker");
    expect(wrapper.text()).toContain("Aggression as a system.");
    expect(wrapper.text()).toContain("FIRMWARE DUMP");
    expect(wrapper.text()).toContain("Close distance at any cost.");
    expect(wrapper.text()).toContain("ROUND 1: CHARGE immediately.");
    expect(wrapper.text()).toContain("All-in: ignore DEFEND");
    expect(wrapper.text()).toContain("EMERGENCY · OWN HP < 25%");
  });

  test("renders trigger conditions compactly (WHEN … → …)", () => {
    const wrapper = mount(BrainCard, {
      props: { brain: berserker, selected: false },
    });

    const text = wrapper.text();
    expect(text).toContain("TRIGGER 1");
    expect(text).toContain("TRIGGER 3");
    expect(text).toContain("WHEN OWN ENERGY >= 20");
    expect(text).toContain("WHEN DISTANCE_CATEGORY != CLOSE");
    expect(text).toContain("WHEN ENEMY LAST ACTION = RETREAT");
    expect(wrapper.findAll(".t-sep")).toHaveLength(3);
  });

  test("highlights gameplay keywords", () => {
    const wrapper = mount(BrainCard, {
      props: { brain: berserker, selected: false },
    });

    const keywords = wrapper.findAll("mark").map((m) => m.text());
    expect(keywords).toContain("CHARGE");
    expect(keywords).toContain("MELEE_ATTACK");
    expect(keywords).not.toContain("charge");
  });

  test("emits select on click", async () => {
    const wrapper = mount(BrainCard, {
      props: { brain: berserker, selected: false },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("select")).toEqual([[]]);
  });

  test("reflects selection state", () => {
    const wrapper = mount(BrainCard, {
      props: { brain: berserker, selected: true },
    });

    expect(wrapper.attributes("aria-pressed")).toBe("true");
    expect(wrapper.text()).toContain("BRAIN LOCKED");
    expect(wrapper.text()).not.toContain("DEPLOY BRAIN");
  });
});
