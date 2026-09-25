import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ProfileSelectionScreen from "./ProfileSelectionScreen.vue";

// happy-dom has no WebGL, so the 3D bay stays offline and only the HUD is
// exercised here — which is exactly the part that owns selection state.

function key(type: "keydown" | "keyup", k: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { key: k }));
}

describe("ProfileSelectionScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders a tile per combat profile, first one on the turntable", () => {
    const wrapper = mount(ProfileSelectionScreen);

    const tiles = wrapper.findAll(".tile");
    expect(tiles).toHaveLength(3);
    expect(tiles[0]!.attributes("aria-pressed")).toBe("true");
    expect(wrapper.get(".name").text()).toBe("Brawler");
    wrapper.unmount();
  });

  test("shows the chassis spec sheet", () => {
    const wrapper = mount(ProfileSelectionScreen);

    const stats = wrapper.get(".stats").text();
    expect(stats).toContain("85 T");
    expect(stats).toContain("220");
    expect(stats).toContain("HEAVY · −12% DMG");
    expect(stats).toContain("8 m / 20 m");
    expect(stats).toContain("Power Hammer");
    expect(stats).toContain("MELEE · CLOSE · 16 EN");
    expect(stats).toContain("Autocannon");
    expect(stats).toContain("RANGED · > 10 m · 10 EN");
    wrapper.unmount();
  });

  test("falls back to the HUD when WebGL is unavailable", async () => {
    const wrapper = mount(ProfileSelectionScreen);
    await vi.advanceTimersByTimeAsync(0);

    expect(wrapper.text()).toContain("3D BAY OFFLINE");
    wrapper.unmount();
  });

  test("shows the committed brain in the step bar", () => {
    const wrapper = mount(ProfileSelectionScreen, { props: { brainId: "SENTINEL" } });

    expect(wrapper.get(".steps").text()).toContain("SENTINEL");
    wrapper.unmount();
  });

  test("tiles, arrows and keys switch the chassis", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    await wrapper.findAll(".tile")[2]!.trigger("click");
    expect(wrapper.get(".name").text()).toBe("Skirmisher");

    key("keydown", "d"); // wraps to the first chassis
    await wrapper.vm.$nextTick();
    expect(wrapper.get(".name").text()).toBe("Brawler");

    await wrapper.findAll(".nav")[0]!.trigger("click");
    expect(wrapper.get(".name").text()).toBe("Skirmisher");
    wrapper.unmount();
  });

  test("holding deploy locks the chassis and emits confirm", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    await wrapper.findAll(".tile")[1]!.trigger("click");
    key("keydown", "Enter");
    await vi.advanceTimersByTimeAsync(1200);

    expect(wrapper.get(".locked").text()).toContain("CHASSIS LOCKED");
    expect(wrapper.get(".deploy").attributes("disabled")).toBeDefined();

    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.emitted("confirm")).toEqual([["ASSAULT"]]);
    wrapper.unmount();
  });

  test("releasing early does not deploy", async () => {
    const wrapper = mount(ProfileSelectionScreen);

    key("keydown", "Enter");
    await vi.advanceTimersByTimeAsync(300);
    key("keyup", "Enter");
    await vi.advanceTimersByTimeAsync(3000);

    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.get(".locked").text()).toBe("");
    wrapper.unmount();
  });

  test("escape asks to go back to brain selection", () => {
    const wrapper = mount(ProfileSelectionScreen);

    key("keydown", "Escape");

    expect(wrapper.emitted("back")).toEqual([[]]);
    wrapper.unmount();
  });
});
