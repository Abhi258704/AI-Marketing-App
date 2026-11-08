import test from "node:test";
import assert from "node:assert/strict";
import { extractHtmlSignals, isPublicIp, normalizeWebsiteUrl } from "../services/seo-audit.service.js";

test("normalizes a domain to HTTPS and removes fragments", () => {
  assert.equal(normalizeWebsiteUrl("example.com/about#contact"), "https://example.com/about");
});

test("rejects non-web protocols and credential-bearing URLs", () => {
  assert.throws(() => normalizeWebsiteUrl("file:///etc/passwd"));
  assert.throws(() => normalizeWebsiteUrl("https://user:pass@example.com"));
});

test("blocks private, loopback and link-local addresses", () => {
  for (const address of ["127.0.0.1", "10.0.0.2", "172.16.0.1", "192.168.1.2", "169.254.169.254", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:192.168.1.10"]) {
    assert.equal(isPublicIp(address), false, address);
  }
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("extracts key page-level SEO signals", () => {
  const html = [
    "<html lang='en'><head><title>Sample website title</title>",
    "<meta name='description' content='A helpful description for this example page.'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<link rel='canonical' href='https://example.com/page'>",
    "</head><body><h1>Main heading</h1><h2>Section</h2>",
    "<img src='/one.jpg'><img src='/two.jpg' alt='Product'>",
    "<a href='/about'>About</a><a href='https://other.example/page'>External</a>",
    "<script type='application/ld+json'>{}</script><p>Useful page text.</p></body></html>",
  ].join("");
  const result = extractHtmlSignals(html, "https://example.com/page");
  assert.equal(result.title, "Sample website title");
  assert.equal(result.metaDescription, "A helpful description for this example page.");
  assert.equal(result.h1Text.length, 1);
  assert.equal(result.h2Count, 1);
  assert.equal(result.imageCount, 2);
  assert.equal(result.imagesMissingAlt, 1);
  assert.equal(result.hasViewport, true);
  assert.equal(result.canonical, "https://example.com/page");
  assert.equal(result.structuredDataCount, 1);
  assert.equal(result.internalLinks.length, 1);
  assert.equal(result.externalLinkCount, 1);
});
