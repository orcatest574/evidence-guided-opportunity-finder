import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScienceParkApp } from "@/components/science-park-app";

describe("Theme toggle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.documentElement.classList.remove("dark");
  });

  it("toggles dark mode and persists the selection", async () => {
    act(() => root.render(<ScienceParkApp/>));

    const darkModeButton = container.querySelector<HTMLButtonElement>('[aria-label="Switch to dark mode"]');
    expect(darkModeButton).not.toBeNull();
    act(() => darkModeButton!.click());
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("vsp-theme")).toBe("dark");

    const lightModeButton = container.querySelector<HTMLButtonElement>('[aria-label="Switch to light mode"]');
    expect(lightModeButton).not.toBeNull();
    act(() => lightModeButton!.click());
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("vsp-theme")).toBe("light");
  });
});
