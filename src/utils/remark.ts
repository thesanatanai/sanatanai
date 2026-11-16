
import type { Root, Paragraph, Html } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

interface Options {
  tags?: string[];
}

const remarkCustomBlocks: Plugin<[Options?], Root> = (
  options = {},
) => {
  const tags = options.tags ?? ["gita", "canvas"];

  return (tree, file) => {
    const source = String(file.value);

    visit(tree, "paragraph", (node, index, parent) => {
      if (index === undefined || !parent) return;

      const paragraph = node as Paragraph;
      const start = paragraph.position?.start.offset;
      const end = paragraph.position?.end.offset;

      if (start === undefined || end === undefined) return;

      const raw = source.slice(start, end).trim();

      // Only promote paragraphs consisting of standalone custom tags.
      const tagPattern = tags.join("|");

      const pattern = new RegExp(
        `^(?:<(?:${tagPattern})\\b[^>]*>[\\s\\S]*?<\\/(?:${tagPattern})\\s*>\\s*)+$`,
        "i",
      );

      if (!pattern.test(raw)) return;

      const htmlNode: Html = {
        type: "html",
        value: raw,
        position: paragraph.position,
      };

      parent.children[index] = htmlNode;
    });
  };
};

export default remarkCustomBlocks;
