import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App.vue";

// Flow per SPEC §52: Choose Brain → Choose Combat Profile → (Match follows).

type Wrapper = ReturnType<typeof mount>;

function key(type: "keydown" | "keyup", k: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { key: k }));
}

async function linkBrain(wrapper: Wrapper, index = 0): Promise<void> {
  const cards = wrapper.findAll(".card");
  if (index !== 0) await cards[index]!.trigger("click");
  await wrapper.get(".go").trigger("click");
  await vi.advanceTimersByTimeAsync(5000);
}

async function deployChassis(): Promise<void> {
  key("keydown", "Enter");
  await vi.advanceTimersByTimeAsync(1200);
  key("keyup", "Enter");
  await vi.advanceTimersByTimeAsync(2000);
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("starts at brain selection", () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain("Steelmind");
    expect(wrapper.text()).toContain("Select Brain");
    expect(wrapper.findAll(".card")).toHaveLength(5);
    wrapper.unmount();
  });

  test("flows brain link → chassis bay", async () => {
    const wrapper = mount(App);

    await linkBrain(wrapper);

    expect(wrapper.text()).toContain("CHASSIS BAY");
    expect(wrapper.findAll(".tile")).toHaveLength(3);
    expect(wrapper.get(".steps").text()).toContain("BERSERKER");
    wrapper.unmount();
  });

  test("escape in the chassis bay returns to brain selection", async () => {
    const wrapper = mount(App);

    await linkBrain(wrapper);
    key("keydown", "Escape");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Select Brain");
    wrapper.unmount();
  });

  test("flows chassis deploy → loadout summary", async () => {
    const wrapper = mount(App);

    await linkBrain(wrapper); // BERSERKER
    await deployChassis(); // BRAWLER

    const text = wrapper.text();
    expect(text).toContain("Loadout Ready");
    expect(text).toContain("Berserker");
    expect(text).toContain("Brawler");
    expect(text).toContain("MATCH SCREEN FOLLOWS");
    wrapper.unmount();
  });

  test("reselect profile returns to the chassis bay", async () => {
    const wrapper = mount(App);

    await linkBrain(wrapper);
    await deployChassis();
    await wrapper.findAll("button")[1]!.trigger("click"); // RESELECT PROFILE

    expect(wrapper.text()).toContain("CHASSIS BAY");
    wrapper.unmount();
  });

  test("reselect brain returns to the brain screen and accepts a new pick", async () => {
    const wrapper = mount(App);

    await linkBrain(wrapper); // BERSERKER
    await deployChassis(); // BRAWLER
    await wrapper.findAll("button")[0]!.trigger("click"); // RESELECT BRAIN

    expect(wrapper.text()).toContain("Select Brain");
    await linkBrain(wrapper, 1); // SENTINEL
    await deployChassis(); // BRAWLER again

    const text = wrapper.text();
    expect(text).toContain("Loadout Ready");
    expect(text).toContain("Sentinel");
    expect(text).toContain("Brawler");
    wrapper.unmount();
  });
});
