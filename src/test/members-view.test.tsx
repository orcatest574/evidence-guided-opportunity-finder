import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MembersView } from "@/components/vsp/members-view";

describe("Members directory search", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("filters member cards and clears the search", () => {
    act(() => root.render(<MembersView onOpen={() => {}}/>));
    expect(container.querySelectorAll(".member-card")).toHaveLength(3);

    const input = container.querySelector<HTMLInputElement>('[aria-label="Search member companies"]')!;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      valueSetter.call(input, "ROXTEC");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(container.querySelectorAll(".member-card")).toHaveLength(1);
    expect(container.querySelector(".member-name")?.textContent).toBe("Roxtec");

    act(() => {
      valueSetter.call(input, "nk");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".member-card")).toHaveLength(1);
    expect(container.querySelector(".member-name")?.textContent).toBe("NKT");

    act(() => {
      valueSetter.call(input, "no matching company");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".member-card")).toHaveLength(0);
    expect(container.textContent).toContain("No companies match");

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Clear company search"]')!.click());
    expect(container.querySelectorAll(".member-card")).toHaveLength(3);
  });
});
