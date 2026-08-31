import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import App from "./App.vue";

describe("App", () => {
  test("renders the title", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Steelmind");
  });
});
