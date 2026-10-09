"use client";

import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { mermaid } from "@streamdown/mermaid";
import { code } from "@streamdown/code";
import { useContext, type ReactNode } from "react";
import { All } from "@/app/(root)/AllContext";

function GeetaBlock(props: Readonly<{ children: unknown }>) {
  const txt = props.children?.toString().split("+");
  return (
    <div className="gita">
      <h1>{txt?.[1]}</h1>
      <h2>{txt?.[2]}</h2>
      <h3>{txt?.[3]}</h3>
    </div>
  );
}

function preprocess(md?: string) {
  if (!md) return "";
  md = md.replace(
    /^\[!!gita!!\]\[([^\n]+)\]\[([\s\S]+?)\]\[([\s\S]*?)\]\[!!gita!!\]/gm,
    (_, title, body, meaning) => {
      return `<gita>\n\n
      +${title.trim()}
      +${body.trim()}
      +${meaning.trim()}
      \n\n</gita>
      `;
    },
  );

  md = md
    .replace(/\[!!btn!!\]\[(.*?)\]\[!!btn!!\]/g, (_, text) => {
      return `<chat-btn>${text}</chat-btn>`;
    })
    .replace(
      /^````\s*?\n([\s\S]+?)\n\s*?````/gm,
      (_, inner) => `<canvas>${inner}</canvas>`,
    );
  return md;
}

export default function MarkDown({
  markdown: md,
  streaming,
}: Readonly<{
  markdown: string;
  streaming?: boolean;
}>) {
  const isDark = useContext(All).theme[0] === "dark"
  return (
    <Streamdown
      allowedTags={{
        gita: [],
        canvas: [],
        "chat-btn": [],
      }}
      plugins={{
        mermaid,
        code,
      }}
      animated={streaming}
      mode={streaming ? "streaming" : "static"}
      components={{
        gita: ({ children }) => <GeetaBlock>{children}</GeetaBlock>,
        "chat-btn": ({ children }) => (
          <button className="chat-btn" onClick={() => {}}>{children as ReactNode}</button>
        ),
        canvas: ({ children }) => <div className="canvas">{children}</div>,
      }}
      literalTagContent={["gita", "chat-btn"]}
      // Relative and z-0 to prevent other streamdown components from overlapping
      // current Sanatan AI components.
      className="not-prose relative z-0"
      mermaid={{
        config: {
          theme: isDark ? "dark" : "default"
        }
      }}
    >
      {preprocess(md)}
    </Streamdown>
  );
}
