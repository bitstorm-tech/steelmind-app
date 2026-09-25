import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import BrainSelectionScreen from "./BrainSelectionScreen.vue";

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("BrainSelectionScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders all five starter brains in the carousel", () => {
    const wrapper = mount(BrainSelectionScreen);

    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(5);
    for (const name of ["Berserker", "Sentinel", "Opportunist", "Technician", "Trickster"]) {
      expect(wrapper.text()).toContain(name);
    }
    wrapper.unmount();
  });

  test("starts focused on the first brain with its core directive", async () => {
    const wrapper = mount(BrainSelectionScreen);
    await vi.advanceTimersByTimeAsync(1000);

    expect(wrapper.findAll(".card")[0]!.attributes("aria-pressed")).toBe("true");
    expect(wrapper.get(".panel.left h3").text()).toContain("BRN-01");
    expect(wrapper.get(".detail").text()).toContain("CORE DIRECTIVE · ALWAYS ON");
    expect(wrapper.get(".detail").text()).toContain("Close distance at any cost.");
    wrapper.unmount();
  });

  test("clicking another card brings it into focus without linking", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[1]!.trigger("click");

    const cards = wrapper.findAll(".card");
    expect(cards[1]!.attributes("aria-pressed")).toBe("true");
    expect(cards[0]!.attributes("aria-pressed")).toBe("false");
    expect(wrapper.get(".panel.left h3").text()).toContain("BRN-02");
    expect(wrapper.get(".link").classes()).not.toContain("on");
    wrapper.unmount();
  });

  test("keyboard browses the carousel and wraps around", async () => {
    const wrapper = mount(BrainSelectionScreen);

    press("a");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".card")[4]!.attributes("aria-pressed")).toBe("true");

    press("ArrowRight");
    press("d");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".card")[1]!.attributes("aria-pressed")).toBe("true");
    wrapper.unmount();
  });

  test("inspecting a layer shows its condition and directive", async () => {
    const wrapper = mount(BrainSelectionScreen);

    press("s"); // CORE → wraps to EMERGENCY
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.get(".detail").text()).toContain("WHEN OWN HP < 25% · OVERRIDES ALL");

    press("s"); // TRIGGER 1
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.get(".detail").text()).toContain("WHEN OWN ENERGY >= 20");
    expect(wrapper.findAll(".detail mark").map((m) => m.text())).toContain("CHARGE");
    wrapper.unmount();
  });

  test("linking the focused brain runs the handshake and emits confirm", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[3]!.trigger("click");
    await wrapper.get(".go").trigger("click");

    expect(wrapper.get(".link").classes()).toContain("on");
    expect(wrapper.get(".link").text()).toContain("TECHNICIAN");
    expect(wrapper.emitted("confirm")).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.get(".link").text()).toContain("LINK ESTABLISHED");
    expect(wrapper.emitted("confirm")).toEqual([["TECHNICIAN"]]);
    wrapper.unmount();
  });

  test("clicking the focused card links it; browsing is locked while linking", async () => {
    const wrapper = mount(BrainSelectionScreen);

    await wrapper.findAll(".card")[0]!.trigger("click");
    press("d");
    await vi.advanceTimersByTimeAsync(5000);

    expect(wrapper.emitted("confirm")).toEqual([["BERSERKER"]]);
    wrapper.unmount();
  });
});
