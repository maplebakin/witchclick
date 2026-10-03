import fs from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
const preferences = read("scripts/comfort-preferences.js").replace("export {};", "");

function createDom(stored?: string) {
  const dom = new JSDOM("<html data-theme='autumn-window'><body></body></html>", {
    url: "https://witchclick.space",
    runScripts: "outside-only",
  });
  if (stored) dom.window.localStorage.setItem("witchclick-comfort", stored);
  dom.window.eval(preferences);
  return dom;
}

describe("reader comfort modes", () => {
  it("synchronizes both control instances and persists the selected mode", () => {
    const dom = createDom();
    const source = read("components/ComfortSettings.astro");
    const markup = source.split("\n---\n")[1]!.split("<script")[0]!;
    const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!;
    const { document } = dom.window;
    for (const variant of ["inline", "stacked"]) {
      const host = document.createElement("details");
      host.className = "comfort-settings";
      host.innerHTML = markup.slice(markup.indexOf("<summary"), markup.lastIndexOf("</details>"))
        .replace(/\{(summary|fontToggle|themeToggle|calmToggle|plainToggle)Id\}/g, (_, name) => `"${name}-${variant}"`);
      document.body.append(host);
      const element = document.createElement("script");
      document.body.append(element);
      Object.defineProperty(document, "currentScript", { configurable: true, value: element });
      dom.window.eval(script);
    }
    document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const calm = Array.from(document.querySelectorAll<HTMLInputElement>('[data-comfort-mode-toggle="calm"]'));
    const plain = Array.from(document.querySelectorAll<HTMLInputElement>('[data-comfort-mode-toggle="plain"]'));
    const change = (toggle: HTMLInputElement, checked: boolean) => {
      toggle.checked = checked;
      toggle.dispatchEvent(new dom.window.Event("change"));
    };
    expect(calm).toHaveLength(2);
    expect(plain).toHaveLength(2);
    change(calm[0]!, true);
    expect(calm.every(input => input.checked)).toBe(true);
    expect(document.documentElement.dataset.comfortMode).toBe("calm");
    change(plain[1]!, true);
    expect(plain.every(input => input.checked)).toBe(true);
    expect(calm.every(input => !input.checked)).toBe(true);
    const stored = dom.window.localStorage.getItem("witchclick-comfort")!;
    const restored = createDom(stored);
    expect(restored.window.document.documentElement.dataset.comfortMode).toBe("plain");
    restored.window.close();
    change(plain[0]!, false);
    expect(document.documentElement.hasAttribute("data-comfort-mode")).toBe(false);
    expect(JSON.parse(dom.window.localStorage.getItem("witchclick-comfort")!).mode).toBe("standard");
    dom.window.close();
  });

  it.each(["standard", "calm", "plain"])("uses the expected scrolling behavior in %s mode", mode => {
    const dom = createDom(JSON.stringify({ mode }));
    Object.defineProperty(dom.window, "matchMedia", { value: () => ({ matches: false }) });
    const scroll = vi.fn();
    dom.window.scrollTo = scroll;
    const back = read("components/BackToTop.astro").match(/function scrollToTop\(\) \{([\s\S]*?)\n {4}\}/)![1]!;
    dom.window.eval(`(() => { ${back} })()`);
    const behavior = mode === "standard" ? "smooth" : "instant";
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior });

    const button = dom.window.document.createElement("button");
    const section = dom.window.document.createElement("section");
    section.id = "next";
    section.scrollIntoView = vi.fn();
    dom.window.document.body.append(section);
    const handler = read("pages/start.astro").match(/guideButton.addEventListener\("click", \(\) => \{([\s\S]*?)\n {4}\}\);/)![1]!;
    const click = new dom.window.Function("guideButton", handler);
    button.dataset.target = "#next";
    click(button);
    expect(section.scrollIntoView).toHaveBeenLastCalledWith({ behavior, block: "start" });
    button.dataset.target = "#top";
    click(button);
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior });
    dom.window.close();
  });
});
