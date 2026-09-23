import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import BrainSelectionScreen from "./BrainSelectionScreen.vue";

describe("BrainSelectionScreen", () => {
  test("renders all five starter brains", () => {
    const wrapper = mount(BrainSelectionScreen);

    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(5);
    expect(wrapper.text()).toContain("Berserker");
    expect(wrapper.text()).toContain("Sentinel");
    expect(wrapper.text()).toContain("Opportunist");
    expect(wrapper.text()).toContain("Technician");
    expect(wrapper.text()).toContain("Trickster");
  });

  test("commit is disabled until a brain is selected", () => {
    const wrapper = mount(BrainSelectionScreen);

    const commit = wrapper.get(".commit");
    expect(commit.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("NO BRAIN LOADED");
  });

  test("selecting a card locks it and enables commit", async () => {
    const wrapper = mount(BrainSelectionScreen);

    const cards = wrapper.findAll(".card");
    await cards[1]!.trigger("click");

    expect(cards[1]!.attributes("aria-pressed")).toBe("true");
    expect(cards[0]!.attributes("aria-pressed")).toBe("false");
    expect(wrapper.text()).toContain("SELECTED :: Sentinel — BRN-02");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });

  test("commit emits confirm with the selected brain id", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[3]!.trigger("click");
    await wrapper.get(".commit").trigger("click");

    expect(wrapper.emitted("confirm")).toEqual([["TECHNICIAN"]]);
    expect(wrapper.text()).toContain("COMMITTED :: Technician — BRN-04");
  });

  test("reselect clears the commit and keeps the selection", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[0]!.trigger("click");
    await wrapper.get(".commit").trigger("click");
    await wrapper.get(".ghost").trigger("click");

    expect(wrapper.text()).toContain("SELECTED :: Berserker — BRN-01");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });

  test("selecting a different brain after commit unlocks it", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[0]!.trigger("click");
    await wrapper.get(".commit").trigger("click");
    await wrapper.findAll(".card")[4]!.trigger("click");

    expect(wrapper.text()).toContain("SELECTED :: Trickster — BRN-05");
    expect(wrapper.get(".commit").attributes("disabled")).toBeUndefined();
  });
});
