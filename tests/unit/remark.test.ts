import type { Html, Paragraph, Root } from "mdast";
import { describe, expect, it } from "vitest";
import remarkCustomBlocks from "@/utils/remark";

type Transformer = (tree: Root, file: { value: string }) => void;
type Options = { tags?: string[] };

/**
 * Builds a syntax tree the way remark would for plain paragraphs: one
 * paragraph per blank-line separated block, each with its source offsets.
 */
function paragraphsOf(source: string) {
  const children: Paragraph[] = [];
  let offset = 0;
  for (const block of source.split("\n\n")) {
    const position = {
      start: { line: 1, column: 1, offset },
      end: { line: 1, column: 1, offset: offset + block.length },
    };
    children.push({ type: "paragraph", children: [], position });
    offset += block.length + 2;
  }
  return { type: "root", children } as Root;
}

function run(source: string, options?: Options) {
  const transform = (remarkCustomBlocks as unknown as (options?: Options) => Transformer)(options);
  const tree = paragraphsOf(source);
  transform(tree, { value: source });
  return tree.children as (Paragraph | Html)[];
}

describe("remarkCustomBlocks", () => {
  it("promotes a paragraph that is only a <gita> block to raw HTML", () => {
    const block = "<gita>[Title][Shloka][Meaning]</gita>";
    const [intro, promoted, outro] = run(`Intro\n\n${block}\n\nOutro`);
    expect(intro.type).toBe("paragraph");
    expect(promoted).toMatchObject({ type: "html", value: block });
    expect(outro.type).toBe("paragraph");
  });

  it("promotes a paragraph that is only a <canvas> block", () => {
    const block = "<canvas>\n# Essay\nBody\n</canvas>";
    const [promoted] = run(block);
    expect(promoted).toMatchObject({ type: "html", value: block });
  });

  it("keeps the source position of the paragraph it replaces", () => {
    const [intro, promoted] = run("Intro\n\n<gita>[a][b][c]</gita>");
    // "Intro" is 5 characters, then a blank line (2), so the block starts at 7.
    expect(intro.position!.end.offset).toBe(5);
    expect(promoted.position!.start.offset).toBe(7);
    expect(promoted.position!.end.offset).toBe(7 + "<gita>[a][b][c]</gita>".length);
  });

  it("leaves a paragraph alone when text surrounds the tag", () => {
    const tree = run("See <gita>[a][b][c]</gita> for more");
    expect(tree[0].type).toBe("paragraph");
  });

  it("leaves ordinary paragraphs alone", () => {
    const tree = run("Just text.\n\nMore text.");
    expect(tree.map((node) => node.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("promotes several blocks written together in one paragraph", () => {
    const [promoted] = run("<gita>[a][b][c]</gita> <canvas>x</canvas>");
    expect(promoted.type).toBe("html");
  });

  it("ignores the tag name's case and any attributes", () => {
    expect(run("<GITA>[a][b][c]</GITA>")[0].type).toBe("html");
    expect(run('<canvas class="wide">x</canvas>')[0].type).toBe("html");
  });

  it("does not promote tags that are not in the list (by default only gita and canvas)", () => {
    expect(run("<badge>Ok</badge>")[0].type).toBe("paragraph");
    expect(run("<chat-btn>Yes</chat-btn>")[0].type).toBe("paragraph");
  });

  it("does not promote look-alike tags that merely start with a listed name", () => {
    expect(run("<gitanjali>x</gitanjali>")[0].type).toBe("paragraph");
    expect(run("<canvasser>x</canvasser>")[0].type).toBe("paragraph");
  });

  it("promotes a block that is still streaming in, so it renders as a block before its closing tag arrives", () => {
    expect(run("<gita>[a][b][c]")[0].type).toBe("html");
  });

  it("promotes a <timeline> block by default", () => {
    expect(run('<timeline>[{"index":1}]</timeline>')[0].type).toBe("html");
  });

  it("supports a custom list of tags", () => {
    const tree = run("<badge>Ok</badge>\n\n<gita>[a][b][c]</gita>", { tags: ["badge"] });
    expect(tree.map((node) => node.type)).toEqual(["html", "paragraph"]);
  });

  it("skips paragraphs that have no source position", () => {
    const source = "<gita>[a][b][c]</gita>";
    const tree = { type: "root", children: [{ type: "paragraph", children: [] }] } as Root;
    const transform = (remarkCustomBlocks as unknown as (options?: Options) => Transformer)();
    expect(() => transform(tree, { value: source })).not.toThrow();
    expect(tree.children[0].type).toBe("paragraph");
  });
});
