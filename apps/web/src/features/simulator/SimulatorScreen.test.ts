import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import SimulatorScreen from "./SimulatorScreen.vue";

function bay(wrapper: ReturnType<typeof mount>, side: "A" | "B") {
  return wrapper.get(`.bay.side-${side}`);
}

describe("SimulatorScreen", () => {
  test("offers five brains and three chassis per mech", () => {
    const wrapper = mount(SimulatorScreen);

    for (const side of ["A", "B"] as const) {
      expect(bay(wrapper, side).findAll(".brains .opt")).toHaveLength(5);
      expect(bay(wrapper, side).findAll(".profiles .opt")).toHaveLength(3);
    }
    expect(wrapper.find(".log").exists()).toBe(false);
    expect(wrapper.text()).toContain("AWAITING LAUNCH");
  });

  test("pre-fills mech A from the committed loadout", () => {
    const wrapper = mount(SimulatorScreen, {
      props: { initial: { A: { brainId: "SENTINEL", profileId: "ASSAULT" } } },
    });

    expect(bay(wrapper, "A").get(".bay-sum").text()).toBe("Sentinel · Assault");
  });

  test("runs the picked loadouts and renders the round log", async () => {
    const wrapper = mount(SimulatorScreen);

    await bay(wrapper, "A").findAll(".brains .opt")[4]!.trigger("click"); // TRICKSTER
    await bay(wrapper, "B").findAll(".profiles .opt")[0]!.trigger("click"); // BRAWLER
    expect(bay(wrapper, "A").get(".bay-sum").text()).toBe("Trickster · Brawler");
    expect(bay(wrapper, "B").get(".bay-sum").text()).toBe("Technician · Brawler");

    await wrapper.get(".controls .go").trigger("click");

    const rounds = wrapper.findAll(".round");
    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds[0]!.findAll(".act")).toHaveLength(4);
    expect(rounds[0]!.text()).toContain("R01");
    expect(wrapper.get(".verdict").text()).toMatch(/Mech [AB] wins|Draw/);
    expect(wrapper.get(".verdict").text()).toContain("SEED 1");
  });

  test("same seed reproduces the same log", async () => {
    const wrapper = mount(SimulatorScreen);

    await wrapper.get(".controls .go").trigger("click");
    const first = wrapper.get(".log").text();
    await wrapper.get(".controls .go").trigger("click");

    expect(wrapper.get(".log").text()).toBe(first);
  });

  test("back emits from the dock and on Escape", async () => {
    const wrapper = mount(SimulatorScreen, { attachTo: document.body });

    await wrapper.get(".dock .ghost").trigger("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(wrapper.emitted("back")).toHaveLength(2);
    wrapper.unmount();
  });
});
