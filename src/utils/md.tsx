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
  const geetaRegex = /\[([^\n]+?)\]\[([^\n]+?)\]\[([^\n]*?)\]/;
  const txt = props.children?.toString();
  if (!txt) return;
  const result = geetaRegex.exec(txt);
  if (!result) return;

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
        "chat-btn": [],
      }}
      plugins={{
        mermaid,
        code,
        math,
      }}
      remarkPlugins={[
        ...Object.values(defaultRemarkPlugins),
        [remarkCustomBlocks, { tags: ["gita", "canvas"] }],
      ]}
      animated={streaming}
      isAnimating={streaming}
      shikiTheme={shiki(isDark)}
      mode={streaming ? "streaming" : "static"}
      components={{
        gita: ({ children }) => <GeetaBlock>{children}</GeetaBlock>,
        "chat-btn": ({ children }) => <ChatBtn>{children}</ChatBtn>,
        canvas: ({ children }) => <div className="canvas">{children}</div>,
      }}
      literalTagContent={["gita", "chat-btn", "badge"]}
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
