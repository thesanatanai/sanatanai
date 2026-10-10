"use client";

import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { mermaid } from "@streamdown/mermaid";
import { code } from "@streamdown/code";
import { Fragment, useContext, type ReactNode } from "react";
import { All } from "@/app/(root)/AllContext";
import PageContext from "@/app/(root)/app/PageContext";

function GeetaBlock(props: Readonly<{ children: unknown }>) {
  const txt = props.children?.toString().split("+");
  const heading = splitLines(txt?.[1]);
  const shloka = splitLines(txt?.[2]);
  const meaning = splitLines(txt?.[3]);
  if (!heading || !shloka)
    return <div className="gita">Invalid Gita Block</div>;
  return (
    <div className="gita">
      <h1>{heading}</h1>
      <h2>{shloka}</h2>
      {meaning && <h3>{meaning}</h3>}
    </div>
  );
}

function splitLines(text: undefined): undefined;
function splitLines(text: string): ReactNode;
function splitLines(text?: string): ReactNode | undefined;
function splitLines(text?: string) {
  if (!text) return;
  const lines = text.split(/\\n/g);
  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {lines.length > index + 1 && <br />}
    </Fragment>
  ));
}

function preprocess(md?: string) {
  if (!md) return "";
  md = md.replace(
    /^\[!!gita!!\]\[([^\n]+)\]\[([^\n]+?)\]\[([^\n]*?)\]\[!!gita!!\]/gm,
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

function ChatBtn({ children }: Readonly<Record<string, unknown>>) {
  const setMessage = useContext(PageContext).userData.btnMessage[1];
  const text = children?.toString();
  if (!text) return;
  return (
    <button className="chat-btn" onClick={() => setMessage(text)}>
      {text}
    </button>
  );
}

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
        "chat-btn": [],
      }}
      plugins={{
        mermaid,
        code,
      }}
      animated={streaming}
      shikiTheme={["vitesse-dark", "vitesse-light"]}
      mode={streaming ? "streaming" : "static"}
      components={{
        gita: ({ children }) => <GeetaBlock>{children}</GeetaBlock>,
        "chat-btn": ChatBtn,
        canvas: ({ children }) => <div className="canvas">{children}</div>,
      }}
      literalTagContent={["gita", "chat-btn"]}
      // Relative and z-0 to prevent other streamdown components from overlapping
      // current Sanatan AI components.
      className="not-prose relative z-0"
      mermaid={{
        config: {
          theme: isDark ? "dark" : "default",
        },
      }}
    >
      {preprocess(md)}
    </Streamdown>
  );
}
