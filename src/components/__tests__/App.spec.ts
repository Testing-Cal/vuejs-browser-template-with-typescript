import { describe, test, expect } from "vitest";

import App from "../../App.vue";
import { mount } from "@vue/test-utils";

describe("App.vue", () => {
  test("is a Vue instance", () => {
    const wrapper = mount(App);
    expect(wrapper.vm).toBeTruthy();
  });
});
