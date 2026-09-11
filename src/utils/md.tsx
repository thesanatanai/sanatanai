"use client";
import { All } from "@/app/(root)/AllContext";
import Md, {
  LinkNodeProps,
  setCustomComponents
} from "markstream-react";
import "markstream-react/index.css";
import { useContext } from "react";
import Mermaid from "@/components/Mermaid";

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
