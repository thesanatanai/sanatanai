import { usedOnDb } from "@/app/(root)/AllContext";
import { LordIcon } from "@/app/types/lordicon";

export const supportedFiles = [
  "application/dart",
  "application/python",
  "application/ecmascript",
  "application/javascript",
  "application/ms-java",
  "application/sql",
  "application/vnd.coffeescript",
  "application/vnd.dart",
  "application/x-httpd-php",
  "application/x-javascript",
  "application/x-lisp",
  "application/x-perl",
  "application/x-php",
  "application/x-python",
  "application/x-ruby",
  "application/x-sql",
  "application/x-yaml",
  "text/coffeescript",
  "text/css",
  "text/ecmascript",
  "text/java",
  "text/javascript",
  "text/sql",
  "text/x-c++-cod",
  "text/x-c++hdr",
  "text/x-c++src",
  "text/x-c-code",
  "text/x-c-header",
  "text/x-chdr",
  "text/x-coffeescript",
  "text/x-csrc",
  "text/x-emacs-lisp",
  "text/x-go",
  "text/x-haskell",
  "text/x-java",
  "text/x-java-source",
  "text/x-lisp",
  "text/x-literate-haskell",
  "text/x-markdown",
  "text/x-objcsrc",
  "text/x-perl",
  "text/x-perl-script",
  "text/x-python",
  "text/x-python-script",
  "text/x-ruby",
  "text/x-ruby-script",
  "text/x-rust",
  "text/x-scala",
  "text/x-sql",
  "text/x-web-markdown",
  "text/x-yaml",
  "application/pdf",
  "text/csv",
  "text/markdown",
  "text/plain",
  "application/json",
  "application/xml",
  "application/yaml",
  "text/xml",
  "text/yaml",
  "text/html",
  "video/3gpp",
  "video/3gpp2",
  "video/avi",
  "video/flv",
  "video/mp2t",
  "video/mp4",
  "video/mp4v-es",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/vnd.mts",
  "video/webm",
  "video/x-flv",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-ms-asf",
  "video/x-ms-wm",
  "video/x-ms-wmv",
  "video/x-ms-wvx",
  "video/x-msvideo",
  "video/x-quicktime",
  "video/mov",
  "video/mpg",
  "video/wmv",
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "image/x-ms-bmp",
  "image/svg+xml",
  "audio/flac",
  "audio/midi",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/vnd.wav",
  "audio/vorbis",
  "audio/wav",
  "audio/x-m4a",
  "audio/x-mid",
  "audio/x-midi",
  "audio/x-wav",
  "audio/aac",
];
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
    console.log(e);
    if (!globalThis.window) fetched(true);
    cookieStore.delete("setupComplete");
    open("/welcome?logout=true", "_self");
    fetched(true);
  }
}

export function useDb(fetched: boolean) {
  return async function setOnDb(
    query: "name" | "email" | "picture" | "prefferedLocale",
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
  let elem = to;
  for (let i = 0; i < count; i++) {
    elem = elem?.parentElement;
  }
  return elem as Element;
}

export function copy(text: string) {
  if (navigator && "clipboard" in navigator) {
    navigator.clipboard.writeText(text);
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
  const logoStyle = "background: linear-gradient(to right, #ff5e00, #ff9100, #ff3300, #ff1e00, #bc16c2, #5139d8, #2b6ee9, #00ff55); font-size: 20px; font-weight: 1000; background-clip: text; color: transparent; font-family: erdana, Geneva, Tahoma, sans-serif, Georgia";
  console.log("%c Sanatan AI", logoStyle);
}