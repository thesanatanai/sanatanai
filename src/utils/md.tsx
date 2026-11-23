"use client";

import { Streamdown, defaultRemarkPlugins } from "streamdown";
import "streamdown/styles.css";
import { mermaid } from "@streamdown/mermaid";
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { Fragment, useContext, type ReactNode } from "react";
import { All } from "@/app/(root)/AllContext";
import PageContext from "@/app/(root)/app/PageContext";
import "katex/dist/katex.min.css";
import customPlugin from "./remark";

// A shloka that stands in its own paragraph is turned into raw HTML by
// remarkCustomBlocks after Streamdown has backslash-escaped its text, while one
// written inside a paragraph arrives unescaped. Undo the escapes so both match.
const unescapeMarkdown = (text: string) => text.replace(/\\([!-/:-@[-`{-~])/g, "$1");

function GeetaBlock(props: Readonly<{ children: unknown }>) {
  const geetaRegex = /^\s*\[([^\n]+?)\]\[([^\n]+?)\]\[([^\n]*?)\]/;
  const invalid = (
    <div className="gita">
      <h2>Invalid Gita Block</h2>
    </div>
  );
  const txt = props.children?.toString();
  if (!txt) return invalid;
  const result = geetaRegex.exec(unescapeMarkdown(txt));
  if (!result) return invalid;

  const [, heading, shloka, meaning] = result;
  if (!heading || !shloka) return;

  return (
    <div className="gita">
      <h1>{splitLines(heading)}</h1>
      <h2>{splitLines(shloka)}</h2>
      {meaning && <h3>{splitLines(meaning)}</h3>}
    </div>
  );
}

function splitLines(text: string): ReactNode;
function splitLines(text: string) {
  const lines = text.split(/\\n/g);
  return lines.map((line, index) => (
    <Fragment key={index + 1}>
      {line}
      {lines.length > index + 1 && <br />}
    </Fragment>
  ));
}

function ChatBtn({ children }: Readonly<{ children: unknown }>) {
  const setMessage = useContext(PageContext).userData.btnMessage[1];
  const text = children?.toString();
  if (!text) return;
  return (
    <button className="chat-btn" onClick={() => setMessage(text)}>
      {text}
    </button>
  );
}

// <partial-json>
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Parses JSON that may be cut off part-way, e.g. while the bot is still typing
 * it. Everything that has arrived is returned: an unfinished string keeps the
 * characters typed so far, while a dangling key or value is dropped. Complete,
 * valid JSON is parsed with plain JSON.parse, so the result is identical.
 */
function parsePartialJson(src: string): Json | undefined {
  try {
    return JSON.parse(src) as Json;
  } catch {}

  let i = 0;
  const literalRe = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y;
  const escapes: Record<string, string> = {
    n: "\n",
    t: "\t",
    r: "\r",
    b: "\b",
    f: "\f",
  };

  function skipSpace() {
    while (i < src.length && /\s/.test(src.charAt(i))) i++;
  }

  // Always returns what has been read so far, even if the closing quote has
  // not arrived yet.
  function readString(): string {
    i++; // opening quote
    let out = "";
    while (i < src.length) {
      const c = src.charAt(i++);
      if (c === '"') return out;
      if (c !== "\\") {
        out += c;
        continue;
      }
      if (i >= src.length) return out; // dangling backslash
      const next = src.charAt(i++);
      if (next !== "u") {
        out += escapes[next] ?? next;
        continue;
      }
      const hex = src.slice(i, i + 4);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
      } else if (i + 4 > src.length) {
        i = src.length; // \uXXXX is still arriving
        return out;
      } else {
        out += "u";
      }
    }
    return out;
  }

  function readLiteral(): Json | undefined {
    literalRe.lastIndex = i;
    const match = literalRe.exec(src);
    if (!match) {
      i++; // unrecognised or still-arriving character, skip it
      return undefined;
    }
    i += match[0].length;
    return JSON.parse(match[0]) as Json;
  }

  function readObject(): Json {
    i++; // {
    const obj: { [key: string]: Json } = {};
    while (i < src.length) {
      skipSpace();
      const c = src.charAt(i);
      if (c === "}") {
        i++;
        break;
      }
      if (c !== '"') {
        i++; // "," or a stray character
        continue;
      }
      const key = readString();
      skipSpace();
      if (src.charAt(i) !== ":") break; // key is still arriving
      i++;
      const value = readValue();
      if (value !== undefined) obj[key] = value;
    }
    return obj;
  }

  function readArray(): Json {
    i++; // [
    const arr: Json[] = [];
    while (i < src.length) {
      skipSpace();
      const c = src.charAt(i);
      if (c === "]") {
        i++;
        break;
      }
      if (c === ",") {
        i++;
        continue;
      }
      const value = readValue();
      if (value !== undefined) arr.push(value);
    }
    return arr;
  }

  function readValue(): Json | undefined {
    skipSpace();
    switch (src.charAt(i)) {
      case "":
        return undefined;
      case "{":
        return readObject();
      case "[":
        return readArray();
      case '"':
        return readString();
      default:
        return readLiteral();
    }
  }

  return readValue();
}
// </partial-json>

type TimelineBlock = {
  index?: unknown;
  time?: unknown;
  heading?: unknown;
  text?: unknown;
};

const asText = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;

// Blocks that have not received their index yet (still being typed) go last.
const rank = (block: TimelineBlock) =>
  typeof block.index === "number" ? block.index : Infinity;

export function Timeline({ children }: Readonly<{ children: unknown }>) {
  const string = children?.toString();
  if (!string?.trim()) return;

  const escaped = string.replace(/\\(.)/g, "$1");
  // While the bot is typing, the JSON is incomplete. Parse what has arrived so
  // the timeline grows block by block instead of showing an error.
  const parsed = parsePartialJson(escaped);
  if (!Array.isArray(parsed)) return <div className="canvas">Invalid Timeline</div>;

  const blocks = parsed
    .flatMap((item, pos) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? [{ block: item as TimelineBlock, pos }]
        : [],
    )
    .sort((a, b) => {
      const x = rank(a.block);
      const y = rank(b.block);
      return x === y ? 0 : x < y ? -1 : 1;
    });
  if (blocks.length === 0) return;

  return (
    <ol className="timeline">
      {blocks.map(({ block, pos }) => {
        const time = asText(block.time);
        const heading = asText(block.heading);
        const text = asText(block.text);
        return (
          <li className="timeline-block" key={pos}>
            <span className="tl-node" aria-hidden="true">
              <i />
            </span>
            {time && <time>{time}</time>}
            {heading && <h2 className="timeline-heading">{heading}</h2>}
            {text && <p className="timeline-text">{text}</p>}
          </li>
        );
      })}
    </ol>
  );
}

const shiki = (dark: boolean): [string, string] =>
  dark ? ["slack-dark", "slack-dark"] : ["github-light", "github-light"];
const math = createMathPlugin({
  singleDollarTextMath: true,
});
export default function MarkDown({
  markdown: md,
  streaming,
}: Readonly<{
  markdown: string;
  streaming?: boolean;
}>) {
  const isDark = useContext(All).theme[0] === "dark";
  return (
    <Streamdown
      allowedTags={{
        gita: [],
        canvas: [],
        badge: ["type"],
        timeline: [],
        meter: ["high", "low", "optimum", "min", "max", "value"],
        "chat-btn": [],
      }}
      plugins={{
        mermaid,
        code,
        math,
      }}
      remarkPlugins={[
        ...Object.values(defaultRemarkPlugins),
        customPlugin,
      ]}
      animated={streaming}
      isAnimating={streaming}
      shikiTheme={shiki(isDark)}
      mode={streaming ? "streaming" : "static"}
      components={{
        gita: ({ children }) => <GeetaBlock>{children}</GeetaBlock>,
        "chat-btn": ({ children }) => <ChatBtn>{children}</ChatBtn>,
        canvas: ({ children }) => <div className="canvas">{children}</div>,
        timeline: ({ children }) => <Timeline>{children}</Timeline>,
      }}
      literalTagContent={["gita", "chat-btn", "badge", "meter", "timeline"]}
      // Relative and z-0 to prevent other streamdown components from overlapping
      // current Sanatan AI components.
      className="not-prose relative z-0"
      mermaid={{
        config: {
          theme: isDark ? "dark" : "default",
        },
      }}
    >
      {md}
    </Streamdown>
  );
}