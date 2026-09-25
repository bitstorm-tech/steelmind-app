import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import LoadoutBriefing from "./LoadoutBriefing.vue";

describe("LoadoutBriefing", () => {
  test("recaps the committed brain and chassis", () => {
    const wrapper = mount(LoadoutBriefing, {
      props: { brainId: "BERSERKER", profileId: "BRAWLER" },
    });

    const text = wrapper.text();
    expect(text).toContain("Loadout Ready");
    expect(text).toContain("Berserker");
    expect(text).toContain("BRAIN // BRN-01");
    expect(text).toContain("Close distance at any cost.");
    expect(text).toContain("Brawler");
    expect(text).toContain("CHASSIS // CDP-01");
    expect(text).toContain("220 HP · HEAVY ARMOR");
    expect(text).toContain("MATCH SCREEN FOLLOWS");
  });

  test("offers reselecting both halves of the loadout", async () => {
    const wrapper = mount(LoadoutBriefing, {
      props: { brainId: "TECHNICIAN", profileId: "SKIRMISHER" },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons.map((b) => b.text())).toEqual(["RESELECT BRAIN", "RESELECT PROFILE", "SIMULATE"]);

    await buttons[0]!.trigger("click");
    await buttons[1]!.trigger("click");

    expect(wrapper.emitted("reselectBrain")).toEqual([[]]);
    expect(wrapper.emitted("reselectProfile")).toEqual([[]]);
  });
});
