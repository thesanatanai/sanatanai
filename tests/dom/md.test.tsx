import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkDown from "@/utils/md";
import { makeAll, makePage, renderWithContexts } from "../helpers/contexts";

/** Renders markdown and waits until its last line (the sentinel) is on screen. */
async function renderMarkdown(markdown: string, options: { dark?: boolean } = {}) {
  const page = makePage();
  const all = makeAll({ theme: options.dark ? "dark" : "light" });
  const result = renderWithContexts(<MarkDown markdown={`${markdown}\n\nDone.`} />, { all, page });
  await screen.findByText("Done.");
  return { ...result, page };
}

describe("MarkDown: standard markdown", () => {
  it("renders emphasis, lists and headings", async () => {
    const { container } = await renderMarkdown("### Title\n\n**bold** and *italic*\n\n- one\n- two");
    expect(container.querySelector("h3")!.textContent).toBe("Title");
    expect(container.querySelector("strong, [data-streamdown='strong']")!.textContent).toBe("bold");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders inline math with KaTeX", async () => {
    const { container } = await renderMarkdown("Euler: $e^{i\\pi} = -1$");
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
  });

  it("does not execute raw script tags from model output", async () => {
    const { container } = await renderMarkdown("Hi <script>window.__pwned = true</script> there");
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("does not render inline event handlers from model output", async () => {
    const { container } = await renderMarkdown('<img src="x" onerror="window.__pwned = true">');
    expect(container.querySelector("[onerror]")).toBeNull();
  });
});

describe("MarkDown: quick-reply buttons (<chat-btn>)", () => {
  it("renders each as a button", async () => {
    await renderMarkdown("Shall I continue? <chat-btn>Yes</chat-btn> <chat-btn>No</chat-btn>");
    expect(screen.getByRole("button", { name: "Yes" }).className).toBe("chat-btn");
    expect(screen.getByRole("button", { name: "No" })).toBeDefined();
  });

  it("sends the button's text as the user's next message when clicked", async () => {
    const { page } = await renderMarkdown("Continue? <chat-btn>Yes</chat-btn>");
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(page.userData.btnMessage[1]).toHaveBeenCalledWith("Yes");
  });
});

describe("MarkDown: canvas (<canvas>)", () => {
  it("shows the content in a canvas box with its markdown rendered", async () => {
    const { container } = await renderMarkdown("Here:\n\n<canvas>\n# Deepawali\nA festival of **lights**\n</canvas>");
    const canvas = container.querySelector(".canvas")!;
    expect(canvas).not.toBeNull();
    expect(canvas.querySelector("h1")!.textContent).toBe("Deepawali");
    expect(canvas.textContent).toContain("A festival of");
  });

  it("supports several canvases in one answer", async () => {
    const { container } = await renderMarkdown("<canvas>\n# One\n</canvas>\n\n<canvas>\n# Two\n</canvas>");
    expect(container.querySelectorAll(".canvas")).toHaveLength(2);
  });
});

describe("MarkDown: shlokas (<gita>)", () => {
  const shloka = "[Geeta 1.1][धर्मक्षेत्रे कुरुक्षेत्रे\\nमामकाः पाण्डवाश्चैव][What did they do?]";

  // Written inside a paragraph (no blank lines around it) the block renders.
  it("renders the reference, the verse and its meaning", async () => {
    const { container } = await renderMarkdown(`Listen:\n<gita>${shloka}</gita>`);
    const block = container.querySelector(".gita")!;
    expect(block.querySelector("h1")!.textContent).toBe("Geeta 1.1");
    expect(block.querySelector("h3")!.textContent).toBe("What did they do?");
  });

  it("turns the literal \\n markers in a verse into line breaks", async () => {
    const { container } = await renderMarkdown(`Listen:\n<gita>${shloka}</gita>`);
    const verse = container.querySelector(".gita h2")!;
    expect(verse.querySelectorAll("br")).toHaveLength(1);
    expect(verse.textContent).toContain("कुरुक्षेत्रे");
    expect(verse.textContent).toContain("मामकाः");
  });

  it("leaves out the meaning when it is empty", async () => {
    const { container } = await renderMarkdown("Listen:\n<gita>[Geeta 2.47][कर्मण्येवाधिकारस्ते][]</gita>");
    expect(container.querySelector(".gita h2")).not.toBeNull();
    expect(container.querySelector(".gita h3")).toBeNull();
  });

  // Regression test for a bug that has been fixed (see CHANGELOG).
  it("renders a shloka that stands in its own paragraph", async () => {
    const { container } = await renderMarkdown(`Listen:\n\n<gita>${shloka}</gita>`);
    expect(container.querySelector(".gita h1")!.textContent).toBe("Geeta 1.1");
  });
});

describe("MarkDown: badges (<badge>)", () => {
  it("renders the badge text", async () => {
    const { container } = await renderMarkdown('<badge type="success">Formula Correct</badge>');
    expect(container.querySelector("badge")!.textContent).toBe("Formula Correct");
  });

  // Regression test for a bug that has been fixed (see CHANGELOG).
  it("keeps the badge type that the stylesheet depends on", async () => {
    const { container } = await renderMarkdown('<badge type="error">Wrong</badge>');
    expect(container.querySelector('badge[type="error"]')).not.toBeNull();
  });
});

describe("MarkDown: timelines (<timeline>)", () => {
  const events = JSON.stringify([
    { index: 2, time: "1947", heading: "Independence", text: "India became free." },
    { index: 1, time: "1857", heading: "First war", text: "A major uprising." },
  ]);

  it("renders the events in index order", async () => {
    const { container } = await renderMarkdown(`History:\n\n<timeline>${events}</timeline>`);
    const items = [...container.querySelectorAll("ol.timeline li")];
    expect(items.map((item) => item.querySelector("h2")?.textContent)).toEqual(["First war", "Independence"]);
    expect(items[0].querySelector("time")!.textContent).toBe("1857");
    expect(items[1].querySelector("p")!.textContent).toBe("India became free.");
  });

  it("shows a notice instead of crashing when the JSON is invalid", async () => {
    const { container } = await renderMarkdown("History:\n\n<timeline>not json</timeline>");
    expect(container.textContent).toContain("Invalid Timeline");
  });
});

describe("MarkDown: meters (<meter>)", () => {
  it("keeps the attributes a meter needs", async () => {
    const { container } = await renderMarkdown(
      'Score: <meter value="0.6" min="0" max="1" low="0.3" high="0.8" optimum="1"></meter>',
    );
    const meter = container.querySelector("meter")!;
    expect(meter.getAttribute("value")).toBe("0.6");
    expect(meter.getAttribute("max")).toBe("1");
  });
});
