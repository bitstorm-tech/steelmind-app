import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import ProfileSelectionScreen from "./ProfileSelectionScreen.vue";

describe("ProfileSelectionScreen", () => {
  test("renders all three combat profiles", () => {
    const wrapper = mount(ProfileSelectionScreen);

    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(3);
    expect(wrapper.text()).toContain("Brawler");
    expect(wrapper.text()).toContain("Assault");
    expect(wrapper.text()).toContain("Skirmisher");
  });

  test("commit is disabled until a profile is selected", () => {
    const wrapper = mount(ProfileSelectionScreen);

    const commit = wrapper.get(".commit");
    expect(commit.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("NO CHASSIS SELECTED");
  });

  test("selecting a card locks it and enables commit", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    const cards = wrapper.findAll(".card");
    await cards[1]!.trigger("click");

    expect(cards[1]!.attributes("aria-pressed")).toBe("true");
    expect(cards[0]!.attributes("aria-pressed")).toBe("false");
    expect(wrapper.text()).toContain("SELECTED :: Assault — 70 t");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });

  test("commit emits confirm with the selected profile id", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    await wrapper.findAll(".card")[2]!.trigger("click");
    await wrapper.get(".commit").trigger("click");

    expect(wrapper.emitted("confirm")).toEqual([["SKIRMISHER"]]);
    expect(wrapper.text()).toContain("COMMITTED :: Skirmisher — 55 t");
  });

  test("reselect clears the commit and keeps the selection", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    await wrapper.findAll(".card")[0]!.trigger("click");
    await wrapper.get(".commit").trigger("click");
    await wrapper.get(".ghost").trigger("click");

    expect(wrapper.text()).toContain("SELECTED :: Brawler — 85 t");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });

  test("selecting a different chassis after commit unlocks it", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    await wrapper.findAll(".card")[0]!.trigger("click");
    await wrapper.get(".commit").trigger("click");
    await wrapper.findAll(".card")[1]!.trigger("click");

    expect(wrapper.text()).toContain("SELECTED :: Assault — 70 t");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });
});
