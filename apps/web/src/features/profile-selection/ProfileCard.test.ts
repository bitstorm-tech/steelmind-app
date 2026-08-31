import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import ProfileCard from "./ProfileCard.vue";
import { COMBAT_PROFILES } from "./profiles";

const brawler = COMBAT_PROFILES[0]!;

describe("ProfileCard", () => {
  test("renders the full spec sheet", () => {
    const wrapper = mount(ProfileCard, {
      props: { profile: brawler, selected: false },
    });

    expect(wrapper.text()).toContain("CDP-01");
    expect(wrapper.text()).toContain("Brawler");
    expect(wrapper.text()).toContain("220");
    expect(wrapper.text()).toContain("HEAVY");
    expect(wrapper.text()).toContain("Power Hammer");
    expect(wrapper.text()).toContain("Autocannon");
    expect(wrapper.text()).toContain("DMG 28 · EN 16");
    expect(wrapper.text()).toContain("PASSIVE −12% INCOMING");
    expect(wrapper.text()).toContain("ADV 8 m · CHARGE 20 m");
  });

  test("emits select on click", async () => {
    const wrapper = mount(ProfileCard, {
      props: { profile: brawler, selected: false },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("select")).toEqual([[]]);
  });

  test("reflects selection state", () => {
    const wrapper = mount(ProfileCard, {
      props: { profile: brawler, selected: true },
    });

    expect(wrapper.attributes("aria-pressed")).toBe("true");
    expect(wrapper.text()).toContain("CHASSIS LOCKED");
    expect(wrapper.text()).not.toContain("DEPLOY CHASSIS");
  });
});
