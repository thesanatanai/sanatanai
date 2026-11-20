import { describe, expect, it } from "vitest";
import { request } from "./support";

const html = async (path: string) => (await request(path)).text();

describe("public pages", () => {
  it.each(["/", "/hi", "/terms", "/privacy", "/welcome"])("serves %s as HTML", async (path) => {
    const res = await request(path);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
  });

  it("answers 404 for a page that does not exist", async () => {
    const res = await request("/this-page-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
  });

  it("renders the English landing page", async () => {
    const page = await html("/");
    expect(page).toMatch(/<title>Sanatan AI/);
    expect(page).toContain("Sanatan");
  });

  it("renders the Hindi landing page in Devanagari", async () => {
    const page = await html("/hi");
    expect(page).toMatch(/<title>[^<]*[\u0900-\u097F]/);
  });
});

describe("SEO", () => {
  it.each([
    ["/", "https://sanatan.shivam.click"],
    ["/hi", "https://sanatan.shivam.click/hi"],
  ])("gives %s its own canonical URL", async (path, canonical) => {
    expect(await html(path)).toContain(`<link rel="canonical" href="${canonical}"/>`);
  });

  it.each(["/", "/hi"])("links both languages to each other from %s", async (path) => {
    const page = await html(path);
    expect(page).toContain('hrefLang="en" href="https://sanatan.shivam.click"');
    expect(page).toContain('hrefLang="hi" href="https://sanatan.shivam.click/hi"');
    expect(page).toContain('hrefLang="x-default"');
  });

  it.each(["/", "/hi"])("has a description and Open Graph tags on %s", async (path) => {
    const page = await html(path);
    expect(page).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(page).toMatch(/<meta property="og:title" content="[^"]+"/);
    expect(page).toMatch(/<meta property="og:image"/);
  });

  // Regression test for a bug that has been fixed (see CHANGELOG).
  it("declares the page language on <html>", async () => {
    expect(await html("/")).toMatch(/<html[^>]* lang="en"/);
    // The Hindi page renders on the client, so its language is switched by a
    // script that runs before first paint rather than set in the server HTML.
    expect(await html("/hi")).toMatch(/documentElement\.lang\s*=\s*'hi'/);
  });
});

describe("crawler and PWA files", () => {
  it("robots.txt keeps the app out of search and points at the sitemap", async () => {
    const res = await request("/robots.txt");
    const text = await res.text();
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(text).toMatch(/Disallow: \/app/);
    expect(text).toContain("Sitemap: https://sanatan.shivam.click/sitemap.xml");
  });

  it("sitemap.xml lists the public pages", async () => {
    const res = await request("/sitemap.xml");
    const xml = await res.text();
    expect(res.headers.get("content-type")).toMatch(/xml/);
    for (const path of ["/", "/terms", "/privacy", "/hi"]) {
      expect(xml).toContain(`<loc>https://sanatan.shivam.click${path}</loc>`);
    }
    expect(xml).not.toContain("/app<");
  });

  it("serves a valid web app manifest whose icons all load", async () => {
    const res = await request("/manifest.webmanifest");
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ name: "Sanatan AI", display: "standalone", start_url: "/" });

    const files = [
      ...manifest.icons.map((icon: { src: string }) => icon.src),
      ...manifest.screenshots.map((shot: { src: string }) => shot.src),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const src of files) {
      const asset = await request(new URL(src, "http://x/").pathname);
      expect(asset.status, src).toBe(200);
      expect(asset.headers.get("content-type"), src).toMatch(/^image\//);
    }
  });

  it("serves the service worker and its offline page", async () => {
    const worker = await request("/sw.js");
    expect(worker.status).toBe(200);
    expect(worker.headers.get("content-type")).toMatch(/javascript/);
    expect(await worker.text()).toContain("offline.html");

    const offline = await request("/offline.html");
    expect(offline.status).toBe(200);
    expect(offline.headers.get("content-type")).toMatch(/^text\/html/);
  });
});

describe("security headers", () => {
  it.each(["/", "/hi", "/terms", "/welcome", "/robots.txt", "/api/user"])(
    "are set on %s",
    async (path) => {
      const res = await request(path);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("permissions-policy")).toContain("camera=()");
      expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    },
  );

  it("hides the framework", async () => {
    expect((await request("/")).headers.get("x-powered-by")).toBeNull();
  });

  it("forces HTTPS in production", async () => {
    expect((await request("/")).headers.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("enforces a content security policy that blocks plugins and framing", async () => {
    const res = await request("/");
    // Enforced, not report-only: a report-only policy would block nothing.
    expect(res.headers.get("content-security-policy-report-only")).toBeNull();
    const policy = res.headers.get("content-security-policy");
    expect(policy).toBeTruthy();
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'self'");
  });

});
