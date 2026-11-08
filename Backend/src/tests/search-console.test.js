import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchConsoleDateRange,
  mapSearchAnalyticsRows,
  mapSearchAnalyticsTotals,
  propertyMatchesWebsite,
} from "../services/search-console-helpers.service.js";
import {
  decryptRefreshToken,
  encryptRefreshToken,
} from "../services/search-console-crypto.service.js";

test("matches a Search Console domain property to its subdomains", () => {
  assert.equal(propertyMatchesWebsite("sc-domain:example.com", "https://www.example.com"), true);
  assert.equal(propertyMatchesWebsite("sc-domain:example.com", "https://shop.example.com/store"), true);
  assert.equal(propertyMatchesWebsite("sc-domain:example.com", "https://example.org"), false);
});

test("matches URL-prefix properties on the same host and path", () => {
  assert.equal(propertyMatchesWebsite("https://www.example.com/", "https://www.example.com/products"), true);
  assert.equal(propertyMatchesWebsite("https://www.example.com/blog/", "https://www.example.com/blog/post"), true);
  assert.equal(propertyMatchesWebsite("https://www.example.com/blog/", "https://www.example.com/shop"), false);
  assert.equal(propertyMatchesWebsite("https://example.com/", "https://www.example.com/"), false);
  assert.equal(propertyMatchesWebsite("http://www.example.com/", "https://www.example.com/"), false);
});

test("uses completed data ending three UTC days before today", () => {
  const range = buildSearchConsoleDateRange(7, new Date("2026-11-08T10:00:00.000Z"));
  assert.deepEqual(range, { days: 7, startDate: "2026-10-30", endDate: "2026-11-05" });
  assert.equal(buildSearchConsoleDateRange(999, new Date("2026-11-08T10:00:00.000Z")).days, 28);
});

test("maps Search Analytics rows and totals without inventing data", () => {
  const rows = mapSearchAnalyticsRows([
    { keys: ["brand name"], clicks: 15, impressions: 120, ctr: 0.125, position: 2.4 },
  ]);
  assert.deepEqual(rows[0], { key: "brand name", clicks: 15, impressions: 120, ctr: 0.125, position: 2.4 });
  assert.deepEqual(mapSearchAnalyticsTotals([{ clicks: 15, impressions: 120, ctr: 0.125, position: 2.4 }]), {
    clicks: 15, impressions: 120, ctr: 0.125, position: 2.4,
  });
  assert.deepEqual(mapSearchAnalyticsTotals([]), { clicks: 0, impressions: 0, ctr: 0, position: 0 });
});

test("encrypts refresh tokens and detects tampering", () => {
  process.env.GSC_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const encrypted = encryptRefreshToken("test-refresh-token");
  assert.notEqual(encrypted.ciphertext, "test-refresh-token");
  assert.equal(decryptRefreshToken(encrypted), "test-refresh-token");
  assert.throws(() => decryptRefreshToken({ ...encrypted, authTag: Buffer.alloc(16).toString("base64") }));
});
