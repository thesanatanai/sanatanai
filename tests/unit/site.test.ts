import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const publicFile = (src: string) => join(process.cwd(), "public", src.replace(/^\//, ""));

describe("robots.txt", () => {
  const rules = robots();

  it("lets crawlers in but keeps the signed-in app out of search results", () => {
    expect(rules.rules).toMatchObject({ userAgent: "*", allow: "/", disallow: "/app" });
  });

  it("points at the sitemap on the public domain", () => {
    expect(rules.sitemap).toBe("https://sanatan.shivam.click/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("lists the public pages in both languages", () => {
    expect(urls).toEqual([
      "https://sanatan.shivam.click/",
      "https://sanatan.shivam.click/terms",
      "https://sanatan.shivam.click/privacy",
      "https://sanatan.shivam.click/hi",
    ]);
  });

  it("never exposes the signed-in app", () => {
    expect(urls.some((url) => new URL(url).pathname.startsWith("/app"))).toBe(false);
  });

  it("has valid modification dates", () => {
    for (const { lastModified } of entries) {
      expect(lastModified).toBeInstanceOf(Date);
      expect(Number.isNaN((lastModified as Date).getTime())).toBe(false);
    }
  });

  it("has no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("web app manifest", () => {
  const app = manifest();

  it("is an installable standalone app", () => {
    expect(app).toMatchObject({
      name: "Sanatan AI",
      display: "standalone",
      start_url: "/",
      scope: "/",
      prefer_related_applications: false,
    });
  });

  it("has icons for the sizes browsers require", () => {
    const sizes = new Set(app.icons?.map((icon) => icon.sizes));
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    const purposes = new Set(app.icons?.map((icon) => icon.purpose));
    expect(purposes).toContain("maskable");
  });

  it("only references files that exist in /public", () => {
    const sources = [
      ...(app.icons ?? []).map((icon) => icon.src),
      ...(app.screenshots ?? []).map((shot) => shot.src),
      ...(app.shortcuts ?? []).flatMap((shortcut) => (shortcut.icons ?? []).map((icon) => icon.src)),
    ];
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      expect(existsSync(publicFile(src)), `public/${src} is missing`).toBe(true);
    }
  });

  it("gives every shortcut a name and an in-app URL", () => {
    for (const shortcut of app.shortcuts ?? []) {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url.startsWith("/")).toBe(true);
    }
  });

  it("provides both wide and narrow screenshots for the install dialog", () => {
    const factors = new Set(app.screenshots?.map((shot) => shot.form_factor));
    expect(factors).toEqual(new Set(["wide", "narrow"]));
  });
});

describe("static public assets", () => {
  it.each(["sw.js", "offline.html", "logo.png", "192x192.png", "512x512.png"])(
    "ships %s",
    (file) => {
      expect(existsSync(publicFile(file))).toBe(true);
    },
  );
});
