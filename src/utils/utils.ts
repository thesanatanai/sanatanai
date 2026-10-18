import { usedOnDb } from "@/app/(root)/AllContext";
import { LordIcon } from "@/app/types/lordicon";

export const fileExtensions = [
  // Programming languages
  "dart", "py", "pyw", "pyi", "ipynb",
  "js", "mjs", "cjs", "jsx", "ts", "mts", "cts", "tsx", "java", "class",
  "c", "h", "cc", "hh", "cpp", "hpp", "cxx", "hxx", "cs", "go", "rs",
  "rb", "rake", "gemspec", "php", "phtml", "pl", "pm", "lisp", "lsp", "cl", "el", "coffee",
  "scala", "sc", "hs", "lhs", "sql", "sh", "bash", "zsh", "fish", "ps1", "psm1", "bat", "cmd",
  "r", "R", "swift", "kt", "kts", "kotlin", "m", "mm", "vue", "svelte", "astro",

  // Web and markup
  "html", "htm", "xhtml", "css", "scss", "sass", "less", "xml", "xsl", "xslt", "xsd", "dtd",
  "svg", "md", "markdown", "mdown", "mkd", "mdx", "rst",
  "adoc", "asciidoc", "tex", "latex", "bib", "rtf",

  // Data and configuration
  "json", "jsonc", "json5", "jsonl", "ndjson",
  "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "properties", 
  "csv", "tsv", "txt", "text", "log", "diff", "patch", "graphql", "gql", "proto", 
  "tf", "tfvars", "dockerfile", "makefile", "gitignore", "editorconfig", "lock",

  // Additional text-based formats
  "xmls", "sql", "prisma", "graphqls", "wasm", "asm", "s", "S", "vue", "handlebars",
  "hbs", "mustache", "ejs", "liquid", "pug", "jade", "haml", "erb", "twig", "nix",
  "ex", "exs", "erl", "hrl", "clj", "cljs", "cljc", "edn", "fs", "fsx", "fsi",
  "vb", "vbs", "plsql", "psql", "sol", "ipynb",
  "http", "pem", "crt", "pub", "key",

  // Documents
  "pdf", "doc", "docx", "odt", "rtf", "tex", "epub",

  // Images
  "bmp", "dib","gif", "heic", "heif", "jpg", "jpeg", "jpe",
  "png", "tif", "tiff", "webp", "svg", "ico", "avif", "apng",

  // Video
  "3gp", "3gpp", "3g2", "3gpp2", "avi", "flv",
  "ts", "m2ts", "mts", "mp4", "m4v", "mpeg", "mpg", "mpe",
  "ogv", "ogg", "mov", "qt", "webm", "mkv", "asf", "wm", "wmv", "wvx",

  // Audio
  "flac", "mid", "midi", "mp3", "m4a", "m4b", "mp4", "mpeg",
  "oga", "ogg", "opus", "wav", "wave", "aac", "aif", "aiff", "wma", "weba", "amr"
];
;
export async function login(
  setters: Record<string, usedOnDb<string>>,
  fetched: (value: boolean) => void,
) {
  try {
    const data = await fetch("api/user");
    const { userData } = await data.json();
    Object.keys(setters).forEach((setter) => {
      setters[setter][1](userData[setter], false);
    });
    fetched(true);
  } catch (e) {
    logger(e);
    if (!globalThis.window) return fetched(true);
    void cookieStore.delete("setupComplete");
    open("/welcome?logout=true", "_self");
    fetched(true);
  }
}

export function useDb(fetched: boolean) {
  return async function setOnDb(
    query: "name" | "email" | "picture" | "preferredLocale",
    value: string,
  ) {
    if (!fetched) return;
    try {
      await fetch("api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [query]: value,
        }),
      });
    } catch {}
  };
}

export function logger(...data: unknown[]) {
  const { log } = console;
  const canLog = process.env.NODE_ENV !== "production";
  if (canLog) log(...data);
}

/**
 * Get parent of parent of parent of ...{@link count} of {@link to}
 * @param to The element to start from
 * @param count The level of parent
 * @returns Parent
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parentCount(to: any, count: number) {
  if(!to || !(to instanceof Element)) return;
  let elem = to;
  for (let i = 0; i < count; i++) {
    elem = elem?.parentElement as Element;
  }
  return elem as Element;
}

export function copy(text: string) {
  if (navigator && "clipboard" in navigator) {
    void navigator.clipboard.writeText(text);
  } else {
    const txt = document.createElement("textarea");
    txt.value = text;
    document.body.appendChild(txt);
    txt.select();
    document.execCommand("copy");
  }
}

export function copyListener(
  { currentTarget: target }: { currentTarget: HTMLButtonElement },
  text: string,
) {
  copy(text);
  const icon = target.querySelector("lord-icon") as unknown as LordIcon;
  icon.src = "icons/done.json";
  icon.trigger = "loop";
  setTimeout(() => {
    icon.src = "icons/copy.json";
    icon.trigger = "hover";
  }, 1000);
}

sign();

type global = {
  signed?: boolean
}
export function sign() {
  if((globalThis as global).signed) return;
  (globalThis as global).signed = true;
  const logoStyle = "background: linear-gradient(to right, #ff5e00, #ff9100, #ff3300, #ff1e00, #bc16c2, #5139d8, #2b6ee9, #00ff55); font-size: 20px; font-weight: 1000; background-clip: text; color: transparent; font-family: Verdana, Geneva, Tahoma, sans-serif, Georgia";
  console.log("%c Sanatan AI", logoStyle);
}

export function speak(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  const text = parentCount(e.target, 3)?.querySelector(".message-text")?.textContent;
  if(!text) return;
  const synth = globalThis.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.rate = 1;
  synth.speak(utterance);
}