import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import App from "./App.vue";

// Flow per SPEC §52: Choose Brain → Choose Combat Profile → (Match follows).

async function commitFirstCard(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.findAll(".card")[0]!.trigger("click");
  await wrapper.get(".commit").trigger("click");
}

describe("App", () => {
  test("renders the title", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Steelmind");
  });

  test("starts at brain selection", () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain("Select Your Brain");
    expect(wrapper.findAll(".card")).toHaveLength(5);
  });

  test("flows brain commit → profile selection", async () => {
    const wrapper = mount(App);

    await commitFirstCard(wrapper);

    expect(wrapper.text()).toContain("Select Your Combat Profile");
    expect(wrapper.findAll(".card")).toHaveLength(3);
  });

  test("flows profile commit → loadout summary", async () => {
    const wrapper = mount(App);

    await commitFirstCard(wrapper); // BERSERKER
    await commitFirstCard(wrapper); // BRAWLER

    const text = wrapper.text();
    expect(text).toContain("Loadout Ready");
    expect(text).toContain("Berserker");
    expect(text).toContain("Brawler");
    expect(text).toContain("MATCH SCREEN FOLLOWS");
  });

  test("reselect profile returns to the profile screen", async () => {
    const wrapper = mount(App);

    await commitFirstCard(wrapper);
    await commitFirstCard(wrapper);
    await wrapper.findAll("button")[1]!.trigger("click"); // RESELECT PROFILE

    expect(wrapper.text()).toContain("Select Your Combat Profile");
  });

  test("reselect brain returns to the brain screen and accepts a new pick", async () => {
    const wrapper = mount(App);

    await commitFirstCard(wrapper); // BERSERKER
    await commitFirstCard(wrapper); // BRAWLER
    await wrapper.findAll("button")[0]!.trigger("click"); // RESELECT BRAIN

    expect(wrapper.text()).toContain("Select Your Brain");
    await wrapper.findAll(".card")[1]!.trigger("click"); // SENTINEL
    await wrapper.get(".commit").trigger("click");

    expect(wrapper.text()).toContain("Select Your Combat Profile");
    await commitFirstCard(wrapper); // BRAWLER again

    const text = wrapper.text();
    expect(text).toContain("Loadout Ready");
    expect(text).toContain("Sentinel");
    expect(text).toContain("Brawler");
  });
});
