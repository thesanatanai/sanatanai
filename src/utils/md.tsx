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
import remarkCustomBlocks from "./remark";

function GeetaBlock(props: Readonly<{ children: unknown }>) {
  const geetaRegex = /\[([^\n]+?)\\\]\\\[([^\n]+?)\\\]\\\[([^\n]*?)\\\]/;
  const invalid = (
    <div className="gita">
      <h2>Invalid Gita Block</h2>
    </div>
  );
  const txt = props.children?.toString();
  if (!txt) return invalid;
  const result = geetaRegex.exec(txt);
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
  const lines = text.split(/\\\\n/g);
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

export function Timeline({ children }: Readonly<{ children: unknown }>) {
  const string = children?.toString();
  if (!string) return;

  const escaped = string.replace(/\\(.)/g, "$1");
  let parsed: TimelineRaw | undefined;
  try {
    parsed = (JSON.parse(escaped) as TimelineRaw).sort(
      (a, b) => a.index - b.index,
    );
  } catch {}
  if (!parsed) return <div className="canvas">Invalid Timeline</div>;
  return (
    <ol className="timeline">
      {parsed.map((block) => {
        return (
          <li className="timeline-block" key={block.index}>
            <span className="tl-node" aria-hidden="true">
              <i />
            </span>
            {block.time && <time>{block.time}</time>}
            {block.heading && (
              <h2 className="timeline-heading">{block.heading}</h2>
            )}
            {block.text && <p className="timeline-text">{block.text}</p>}
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
        badge: [],
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
        [remarkCustomBlocks, { tags: ["gita", "canvas", "timeline"] }],
      ]}
      animated={true || streaming}
      isAnimating={true || streaming}
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
