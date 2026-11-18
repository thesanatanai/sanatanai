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

  // KNOWN BUG (src/utils/remark.ts + src/utils/md.tsx): a shloka written as its
  // OWN paragraph, which is the normal way to write a block, vanishes. The
  // remarkCustomBlocks plugin promotes the paragraph to raw HTML after
  // Streamdown has escaped the brackets, so GeetaBlock receives
  // "\[Title\]\[Shloka\]\[Meaning\]", its regex cannot match "\]\[", and it
  // renders nothing. `it.fails` turns red once fixed; then remove `.fails`.
  it.fails("renders a shloka that stands in its own paragraph", async () => {
    const { container } = await renderMarkdown(`Listen:\n\n<gita>${shloka}</gita>`);
    expect(container.querySelector(".gita h1")!.textContent).toBe("Geeta 1.1");
  });
});

describe("MarkDown: badges (<badge>)", () => {
  it("renders the badge text", async () => {
    const { container } = await renderMarkdown('<badge type="success">Formula Correct</badge>');
    expect(container.querySelector("badge")!.textContent).toBe("Formula Correct");
  });

  // KNOWN BUG (src/utils/md.tsx): src/css/extra.css styles badge[type="error"]
  // and badge[type="neutral"], but `allowedTags` declares `badge: []`, which
  // allows no attributes, so the type is stripped and every badge gets the
  // default style. Allowing "type" fixes it. `it.fails` turns red once fixed.
  it.fails("keeps the badge type that the stylesheet depends on", async () => {
    const { container } = await renderMarkdown('<badge type="error">Wrong</badge>');
    expect(container.querySelector('badge[type="error"]')).not.toBeNull();
  });
});
