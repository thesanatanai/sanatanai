/* eslint-disable react-hooks/purity */
"use client";
import { All } from "@/app/(root)/AllContext";
import Md, {
  LinkNodeProps,
  setCustomComponents,
  type MermaidBlockNodeProps,
} from "markstream-react";
import "markstream-react/index.css";
import { useContext, useMemo } from "react";
import mermaid from "mermaid";
import refManager from "./useRefManager";

const id = "sanatan-md";

setCustomComponents(id, {
  gita: GeetaBlock,
  "chat-btn": ChatButton,
  canvas: Canvas,
  mermaid: Mermaid,
  link: (props: Readonly<LinkNodeProps>) => {
    // We wrap link inside span because passing data-label to a would cause issues with it's styling.
    return (
    <span data-label={props.node.title || props.node.href}>
      <a href={props.node.href}>{props.node.text}</a>
    </span>
    )
  }
});

function GeetaBlock(props: Readonly<{ node: { content: string } }>) {
  const txt = props.node.content.split("+");
  return (
    <div className="gita">
      <h1>{decodeURIComponent(txt[1])}</h1>
      <h2>{decodeURIComponent(txt[2])}</h2>
      <h3>{decodeURIComponent(txt[3])}</h3>
    </div>
  );
}

function ChatButton(props: Readonly<{ node: { content: string } }>) {
  return (
    <button onClick={() => {}}>{decodeURIComponent(props.node.content)}</button>
  );
}

function Canvas(props: Readonly<{ node: { content: string } }>) {
  return (
    <div className="canvas">
      <MarkDown markdown={props.node.content} />
    </div>
  );
}

function Mermaid(props: Readonly<MermaidBlockNodeProps>) {
  const id = useMemo(() => `mermaid-${Date.now()}`, []);
  const divRef = useMemo(() => {
    mermaid.initialize({
      darkMode: props.isDark,
      theme: props.isDark ? "dark" : "default",
      securityLevel: "strict"
    });

    if (props.loading) return;
    const manager = refManager<HTMLDivElement>();
    const { code } = props.node;
    manager.afterAvail(async (div) => {
      const dark = props.isDark // This line updates theme
      div.className = `mermaid`;
      try {
      await mermaid.render(id, code, div);
      } catch (e) {
        div.className = `mermaid ${dark ? "dark" : "light"}`;
        div.textContent = e as string;
      }
    });
    return manager;
  }, [id, props.isDark, props.loading, props.node]);
  return <div className="mermaid" ref={divRef?.set}></div>;
}

function preprocess(md?: string) {
  if (!md) return "";
  md = md.replace(
    /^\[!!gita!!\]\[([^\n]+)\]\[([\s\S]+?)\]\[([\s\S]*?)\]\[!!gita!!\]/gm,
    (_, title, body, meaning) => {
      return `<gita>\n\n
      +${encodeURIComponent(title.trim())}
      +${encodeURIComponent(body.trim())}
      +${encodeURIComponent(meaning.trim())}
      \n\n</gita>
      `;
    },
  );

  md = md
    .replace(/\[!!btn!!\]\[(.*?)\]\[!!btn!!\]/g, (_, text) => {
      return `<chat-btn>${encodeURIComponent(text)}</chat-btn>`;
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
  const isDark = useContext(All).theme[0] == "dark";
  return (
    <Md
      customId={id}
      typewriter
      customHtmlTags={["gita", "chat-btn", "canvas"]}
      content={preprocess(md)}
      final={!streaming}
      themes={Array.from(["github-dark", "github-light"])}
      codeBlockProps={{
        showFontSizeButtons: false,
        darkTheme: "github-dark",
        lightTheme: "github-light",
      }}
      isDark={isDark}
    />
  );
}
