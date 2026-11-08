import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import WebsiteAudit from "../models/websiteAudit.model.js";

const USER_AGENT = "AIMarketingSEO/1.0";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const PAGE_CONCURRENCY = 4;
const MAX_LINKS_PER_PAGE = 150;

export function normalizeWebsiteUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Add a website URL to your business profile first.");
  const candidate = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
  let url;
  try { url = new URL(candidate); } catch { throw new Error("Enter a valid website URL, such as https://example.com."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS websites can be audited.");
  if (url.username || url.password) throw new Error("Website URLs must not contain login credentials.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("For safety, website audits support standard HTTP and HTTPS ports only.");
  url.hash = "";
  if (!url.pathname) url.pathname = "/";
  return url.href;
}

export function isPublicIp(address) {
  const version = isIP(address);
  if (version === 4) {
    const p = address.split(".").map(Number);
    const a = p[0], b = p[1];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && (b === 0 || b === 2)) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0) return false;
    return true;
  }
  if (version === 6) {
    const value = address.toLowerCase();
    if (value.startsWith("::ffff:")) {
      const mapped = value.slice(7);
      if (isIP(mapped) === 4) return isPublicIp(mapped);
    }
    if (value === "::" || value === "::1") return false;
    if (value.startsWith("fc") || value.startsWith("fd")) return false;
    if (/^fe[89ab]/.test(value) || value.startsWith("ff") || value.startsWith("2001:db8")) return false;
    return true;
  }
  return false;
}

function assertSafeUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS targets are allowed.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".test")) {
    throw new Error("Private or local network targets cannot be audited.");
  }
  const version = isIP(hostname);
  if (version && !isPublicIp(hostname)) throw new Error("Private or reserved IP addresses cannot be audited.");
}

function safeLookup(hostname, _options, callback) {
  dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses?.length || addresses.some((item) => !isPublicIp(item.address))) {
      return callback(new Error("The website resolves to a private or reserved IP address."));
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function safeRequest(url, { method = "GET", body = null, headers = {}, maxBytes = MAX_RESPONSE_BYTES } = {}) {
  assertSafeUrl(url);
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => { if (!settled) { settled = true; reject(error); } };
    const started = Date.now();
    const request = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      method,
      path: url.pathname + url.search,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/json;q=0.9,*/*;q=0.5",
        "Accept-Encoding": "identity",
        Connection: "close",
        ...headers,
      },
      lookup: safeLookup,
      servername: url.hostname,
    }, (response) => {
      const declaredLength = Number(response.headers["content-length"] || 0);
      if (declaredLength > maxBytes) {
        response.destroy();
        return fail(new Error("The response is larger than the audit safety limit."));
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) { response.destroy(new Error("The response is larger than the audit safety limit.")); return; }
        chunks.push(chunk);
      });
      response.on("error", fail);
      response.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({
          statusCode: response.statusCode || 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8"),
          responseTimeMs: Date.now() - started,
        });
      });
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error("Website request timed out.")));
    request.on("error", fail);
    if (body) request.write(body);
    request.end();
  });
}

async function requestWithRedirects(input, options = {}) {
  const first = new URL(input);
  const allowedOrigin = first.origin;
  let current = first;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const result = await safeRequest(current, options);
    const location = result.headers.location;
    if (result.statusCode >= 300 && result.statusCode < 400 && location) {
      const next = new URL(location, current);
      if (next.origin !== allowedOrigin) throw new Error("The website redirects to another host. Cross-domain redirects are not followed.");
      current = next;
      continue;
    }
    return { ...result, finalUrl: current.href };
  }
  throw new Error("The website redirected too many times.");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
}

function parseAttributes(tag) {
  const attrs = {};
  const pattern = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  return attrs;
}

function tagContents(html, tag) {
  const output = [];
  const pattern = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + "\\s*>", "gi");
  let match;
  while ((match = pattern.exec(html))) output.push(decodeEntities(match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()));
  return output;
}

function metaValue(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    if ((attrs.name || "").toLowerCase() === name.toLowerCase()) return attrs.content || "";
  }
  return "";
}

function canonicalValue(html, baseUrl) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    if ((attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical") && attrs.href) {
      try { return new URL(attrs.href, baseUrl).href; } catch { return attrs.href; }
    }
  }
  return null;
}

function normalizeCrawlUrl(input) {
  const url = new URL(input);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.*|gclid|fbclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}

export function extractHtmlSignals(html, baseUrl) {
  const title = tagContents(html, "title")[0] || "";
  const metaDescription = metaValue(html, "description");
  const metaRobots = metaValue(html, "robots");
  const h1Text = tagContents(html, "h1");
  const h2Text = tagContents(html, "h2");
  const images = html.match(/<img\b[^>]*>/gi) || [];
  let imagesMissingAlt = 0;
  for (const image of images) {
    const alt = parseAttributes(image).alt;
    if (!alt || !alt.trim()) imagesMissingAlt += 1;
  }
  const links = html.match(/<a\b[^>]*>/gi) || [];
  const internalLinks = new Set();
  let externalLinkCount = 0;
  for (const link of links) {
    const href = parseAttributes(link).href;
    if (!href || /^(javascript:|mailto:|tel:|data:)/i.test(href) || href.startsWith("#")) continue;
    try {
      const target = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(target.protocol)) continue;
      if (target.origin === new URL(baseUrl).origin) internalLinks.add(normalizeCrawlUrl(target.href));
      else externalLinkCount += 1;
    } catch {
      // Ignore malformed links; they cannot safely be followed.
    }
  }
  const viewport = metaValue(html, "viewport");
  const structuredDataCount = (html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi) || []).length;
  const visibleText = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ").trim();
  return {
    title, metaDescription, metaRobots, canonical: canonicalValue(html, baseUrl),
    h1Text, h2Count: h2Text.length,
    wordCount: visibleText ? visibleText.split(/\s+/).length : 0,
    imageCount: images.length, imagesMissingAlt, hasViewport: Boolean(viewport),
    internalLinks: [...internalLinks].slice(0, MAX_LINKS_PER_PAGE),
    externalLinkCount, structuredDataCount,
  };
}

function robotsGroups(text) {
  const groups = [];
  let current = null;
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.hasRules) { current = { agents: [], rules: [], hasRules: false }; groups.push(current); }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      current.hasRules = true;
      if (value) current.rules.push({ allow: key === "allow", path: value });
    }
  }
  return groups
    .filter((group) => group.agents.includes("*") || group.agents.some((agent) => agent.includes("aimarketingseo")))
    .flatMap((group) => group.rules);
}

function isAllowedByRobots(url, rules) {
  const path = url.pathname + url.search;
  let match = null;
  for (const rule of rules) {
    const exact = rule.path.endsWith("$");
    const raw = exact ? rule.path.slice(0, -1) : rule.path;
    const escaped = raw.replace(/[.+?^$()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp("^" + escaped + (exact ? "$" : ""));
    if (regex.test(path) && (!match || rule.path.length > match.path.length || (rule.path.length === match.path.length && rule.allow))) match = rule;
  }
  return match ? match.allow : true;
}

async function loadSitemapUrls(origin, sitemapHints, maxUrls) {
  const candidates = [...new Set([...(sitemapHints || []), new URL("/sitemap.xml", origin).href])].slice(0, 5);
  const discovered = new Set();
  const visited = new Set();
  async function readSitemap(sitemapUrl, depth) {
    if (depth > 2 || visited.has(sitemapUrl) || visited.size >= 8) return;
    visited.add(sitemapUrl);
    try {
      const response = await requestWithRedirects(sitemapUrl);
      if (response.statusCode < 200 || response.statusCode >= 300) return;
      const locs = [...response.body.matchAll(/<loc[^>]*>([\s\S]*?)<\/loc>/gi)].map((match) => decodeEntities(match[1].trim())).filter(Boolean);
      if (/<sitemapindex\b/i.test(response.body)) {
        for (const child of locs.slice(0, 5)) {
          try { const url = new URL(child); if (url.origin === origin) await readSitemap(url.href, depth + 1); } catch {
            // Ignore malformed or cross-origin sitemap entries.
          }
        }
      } else {
        for (const loc of locs) {
          try {
            const url = new URL(normalizeCrawlUrl(loc));
            if (url.origin === origin) discovered.add(url.href);
            if (discovered.size >= maxUrls) return;
          } catch {
            // Ignore malformed sitemap entries.
          }
        }
      }
    } catch {
      // An inaccessible sitemap is reported in the audit summary.
    }
  }
  for (const candidate of candidates) {
    await readSitemap(candidate, 0);
    if (discovered.size >= maxUrls) break;
  }
  return [...discovered].slice(0, maxUrls);
}

function makeIssue(code, category, severity, title, description, recommendation, pageUrl, evidence = "") {
  return { code, category, severity, title, description, recommendation, pageUrl: pageUrl || null, evidence, status: "open" };
}

function pageIssues(page, requestedUrl) {
  const issues = [];
  const url = page.finalUrl || requestedUrl;
  if (page.statusCode === 0) {
    issues.push(makeIssue("PAGE_FETCH_FAILED", "technical", "high", "Page could not be fetched", "The crawler could not retrieve this URL.", "Check whether the page is publicly accessible and responds reliably.", requestedUrl));
    return issues;
  }
  if (page.statusCode >= 400) issues.push(makeIssue("HTTP_ERROR", "technical", "critical", "Page returns an HTTP error", "Search engines and visitors may not be able to access this page.", "Fix the server error or update internal links that point to this URL.", url, "HTTP " + page.statusCode));
  if (new URL(url).protocol !== "https:") issues.push(makeIssue("HTTPS_MISSING", "technical", "high", "Page is not using HTTPS", "This URL is served over an unencrypted connection.", "Enable HTTPS and redirect HTTP URLs to their HTTPS equivalent.", url));
  if (!page.title) issues.push(makeIssue("TITLE_MISSING", "on-page", "high", "Page title is missing", "The HTML document does not contain a usable title element.", "Add a unique, descriptive title that accurately summarizes this page.", url));
  else if (page.titleLength < 30 || page.titleLength > 60) issues.push(makeIssue("TITLE_LENGTH", "on-page", "low", "Review page title length", "The title is " + page.titleLength + " characters. This is a heuristic, not a Google limit.", "Make the title concise and specific; avoid adding words only to reach a character target.", url, page.title));
  if (!page.metaDescription) issues.push(makeIssue("META_DESCRIPTION_MISSING", "on-page", "medium", "Meta description is missing", "No meta description was found in the HTML.", "Write a clear page-specific summary that encourages the right visitor to click.", url));
  else if (page.descriptionLength < 70 || page.descriptionLength > 170) issues.push(makeIssue("META_DESCRIPTION_LENGTH", "on-page", "low", "Review meta description length", "The description is " + page.descriptionLength + " characters. Google may rewrite snippets and does not enforce a fixed length.", "Keep the description useful, specific and natural rather than targeting an exact character count.", url, page.metaDescription));
  if (page.h1Count === 0) issues.push(makeIssue("H1_MISSING", "on-page", "medium", "Main heading is missing", "No H1 heading was found in the page HTML.", "Add a clear main heading that describes the page's primary topic.", url));
  else if (page.h1Count > 1) issues.push(makeIssue("MULTIPLE_H1", "on-page", "low", "Multiple H1 headings found", "The crawler found " + page.h1Count + " H1 elements.", "Review the heading hierarchy and make the primary page heading clear.", url, page.h1Text.slice(0, 4).join(" | ")));
  if (!page.hasViewport) issues.push(makeIssue("VIEWPORT_MISSING", "technical", "high", "Mobile viewport is not configured", "No viewport meta tag was found.", "Add a responsive viewport meta tag so mobile browsers render the page at the device width.", url));
  if (page.imagesMissingAlt > 0) issues.push(makeIssue("IMAGE_ALT_MISSING", "content", "medium", "Images are missing alternative text", page.imagesMissingAlt + " of " + page.imageCount + " images have no meaningful alt text.", "Add concise alt text to informative images and use empty alt text only for decorative images.", url));
  if (!page.canonical) issues.push(makeIssue("CANONICAL_MISSING", "technical", "low", "Canonical URL is not declared", "No rel=canonical link was found.", "Consider adding a self-referencing canonical URL, especially when the page can be reached through multiple URLs.", url));
  if (/\bnoindex\b/i.test(page.metaRobots)) issues.push(makeIssue("NOINDEX_DIRECTIVE", "technical", "high", "Page has a noindex directive", "A robots directive tells search engines not to index this page.", "Confirm that this is intentional. Remove noindex only for pages that should appear in search results.", url, page.metaRobots));
  return issues;
}

async function getPageSpeedData(url) {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) endpoint.searchParams.append("category", category);
  if (process.env.PAGESPEED_API_KEY) endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  try {
    const response = await requestWithRedirects(endpoint.href, { maxBytes: 4 * 1024 * 1024 });
    if (response.statusCode !== 200) return { available: false, reason: "PageSpeed API returned HTTP " + response.statusCode };
    const data = JSON.parse(response.body);
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};
    const score = (name) => categories[name]?.score == null ? null : Math.round(categories[name].score * 100);
    return {
      available: true, source: "Google PageSpeed Insights / Lighthouse", strategy: "mobile",
      performanceScore: score("performance"), accessibilityScore: score("accessibility"),
      bestPracticesScore: score("best-practices"), seoScore: score("seo"),
      metrics: {
        firstContentfulPaintMs: audits["first-contentful-paint"]?.numericValue ?? null,
        largestContentfulPaintMs: audits["largest-contentful-paint"]?.numericValue ?? null,
        totalBlockingTimeMs: audits["total-blocking-time"]?.numericValue ?? null,
        cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue ?? null,
        speedIndexMs: audits["speed-index"]?.numericValue ?? null,
      },
      note: "Lighthouse scores are lab diagnostics and can vary between runs.",
    };
  } catch (error) {
    return { available: false, reason: error.message || "PageSpeed could not be reached." };
  }
}

async function getCruxData(origin) {
  if (!process.env.CRUX_API_KEY) return { configured: false, available: false, reason: "Add a free Google CrUX API key to enable real-user Core Web Vitals." };
  const endpoint = new URL("https://chromeuxreport.googleapis.com/v1/records:queryRecord");
  endpoint.searchParams.set("key", process.env.CRUX_API_KEY);
  const body = JSON.stringify({
    origin,
    metrics: ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"],
  });
  try {
    const response = await requestWithRedirects(endpoint.href, {
      method: "POST", body, headers: { "Content-Type": "application/json" }, maxBytes: 1024 * 1024,
    });
    const data = JSON.parse(response.body || "{}");
    if (response.statusCode !== 200 || !data.record?.metrics) {
      return { configured: true, available: false, reason: data.error?.message || "No CrUX field data is available for this origin yet." };
    }
    const metrics = data.record.metrics;
    return {
      configured: true, available: true, source: "Chrome UX Report",
      formFactor: data.record.key?.formFactor || "all",
      collectionPeriod: data.record.collectionPeriod || null,
      metrics: {
        lcpP75: metrics.largest_contentful_paint?.percentiles?.p75 ?? null,
        inpP75: metrics.interaction_to_next_paint?.percentiles?.p75 ?? null,
        clsP75: metrics.cumulative_layout_shift?.percentiles?.p75 ?? null,
      },
    };
  } catch (error) {
    return { configured: true, available: false, reason: error.message || "CrUX could not be reached." };
  }
}

export async function runWebsiteAudit({ website, maxPages = 100 }) {
  const startUrl = normalizeWebsiteUrl(website);
  const base = new URL(startUrl);
  assertSafeUrl(base);
  const origin = base.origin;
  let robotsTxtFound = false;
  let robotsText = "";
  try {
    const response = await requestWithRedirects(new URL("/robots.txt", origin).href);
    robotsTxtFound = response.statusCode >= 200 && response.statusCode < 300;
    if (robotsTxtFound) robotsText = response.body;
  } catch {
    // The audit continues when robots.txt is absent or unavailable.
  }
  const robotsSitemaps = [];
  for (const line of robotsText.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap\s*:\s*(.+)$/i);
    if (match) {
      try { const sitemap = new URL(match[1].trim()); if (sitemap.origin === origin) robotsSitemaps.push(sitemap.href); } catch {
        // Ignore malformed sitemap directives.
      }
    }
  }
  const rules = robotsGroups(robotsText);
  const sitemapUrls = await loadSitemapUrls(origin, robotsSitemaps, maxPages * 3);
  const sitemapFound = sitemapUrls.length > 0;
  const queue = [startUrl, ...sitemapUrls];
  const visited = new Set();
  const pages = [];
  const issues = [];

  if (!isAllowedByRobots(base, rules)) {
    issues.push(makeIssue("ROBOTS_BLOCKS_START_URL", "technical", "high", "Robots.txt blocks the audit start URL", "The website's robots.txt rules disallow the URL provided for this audit.", "Choose a public page intended for crawling or review the robots.txt rules with the site owner.", startUrl));
  } else {
    while (queue.length && pages.length < maxPages) {
      const batch = [];
      while (queue.length && batch.length < PAGE_CONCURRENCY && pages.length + batch.length < maxPages) {
        const candidate = queue.shift();
        let url;
        try { url = new URL(normalizeCrawlUrl(candidate)); } catch { continue; }
        if (url.origin !== origin || visited.has(url.href) || !isAllowedByRobots(url, rules)) continue;
        visited.add(url.href);
        batch.push(url.href);
      }
      if (!batch.length) continue;
      const results = await Promise.all(batch.map(async (url) => {
        try {
          const response = await requestWithRedirects(url);
          const contentType = String(response.headers["content-type"] || "");
          const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType) || /<html\b|<!doctype\s+html/i.test(response.body.slice(0, 500));
          const signals = isHtml ? extractHtmlSignals(response.body, response.finalUrl) : {
            title: "", metaDescription: "", metaRobots: "", canonical: null, h1Text: [], h2Count: 0,
            wordCount: 0, imageCount: 0, imagesMissingAlt: 0, hasViewport: false, internalLinks: [],
            externalLinkCount: 0, structuredDataCount: 0,
          };
          const page = {
            url, finalUrl: response.finalUrl, statusCode: response.statusCode, contentType,
            title: signals.title, titleLength: signals.title.length,
            metaDescription: signals.metaDescription, descriptionLength: signals.metaDescription.length,
            canonical: signals.canonical, metaRobots: signals.metaRobots || String(response.headers["x-robots-tag"] || ""),
            h1Count: signals.h1Text.length, h1Text: signals.h1Text.slice(0, 5), h2Count: signals.h2Count,
            wordCount: signals.wordCount, imageCount: signals.imageCount, imagesMissingAlt: signals.imagesMissingAlt,
            hasViewport: signals.hasViewport, internalLinkCount: signals.internalLinks.length,
            externalLinkCount: signals.externalLinkCount, structuredDataCount: signals.structuredDataCount,
            responseTimeMs: response.responseTimeMs, internalLinks: signals.internalLinks,
          };
          return { page, links: signals.internalLinks, pageIssues: isHtml ? pageIssues(page, url) : [] };
        } catch (error) {
          const page = {
            url, finalUrl: null, statusCode: 0, contentType: "", title: "", titleLength: 0,
            metaDescription: "", descriptionLength: 0, canonical: null, metaRobots: "",
            h1Count: 0, h1Text: [], h2Count: 0, wordCount: 0, imageCount: 0,
            imagesMissingAlt: 0, hasViewport: false, internalLinkCount: 0, externalLinkCount: 0,
            structuredDataCount: 0, responseTimeMs: null, internalLinks: [],
          };
          return {
            page, links: [],
            pageIssues: [makeIssue("PAGE_FETCH_FAILED", "technical", "high", "Page could not be fetched", error.message || "The crawler could not retrieve this URL.", "Check whether the page is publicly accessible and responds reliably.", url)],
          };
        }
      }));
      for (const result of results) {
        pages.push(result.page);
        issues.push(...result.pageIssues);
        for (const link of result.links) if (!visited.has(link) && queue.length < maxPages * 10) queue.push(link);
      }
    }
  }

  const pageByUrl = new Map();
  for (const page of pages) { pageByUrl.set(page.url, page); if (page.finalUrl) pageByUrl.set(page.finalUrl, page); }
  for (const page of pages) {
    for (const link of page.internalLinks || []) {
      const target = pageByUrl.get(link);
      if (target && target.statusCode >= 400) {
        issues.push(makeIssue("BROKEN_INTERNAL_LINK", "technical", "high", "Broken internal link", "This page links to a URL that returned HTTP " + target.statusCode + ".", "Update the link to a working page or remove it.", page.url, link));
      }
    }
  }

  const titles = new Map();
  const descriptions = new Map();
  for (const page of pages) {
    if (page.title) { const key = page.title.trim().toLowerCase(); titles.set(key, [...(titles.get(key) || []), page.url]); }
    if (page.metaDescription) { const key = page.metaDescription.trim().toLowerCase(); descriptions.set(key, [...(descriptions.get(key) || []), page.url]); }
  }
  for (const group of titles.values()) {
    if (group.length > 1) for (const url of group) issues.push(makeIssue("DUPLICATE_TITLE", "on-page", "medium", "Duplicate page title", "The same title appears on " + group.length + " crawled pages.", "Give each important page a distinct title that describes its own content.", url));
  }
  for (const group of descriptions.values()) {
    if (group.length > 1) for (const url of group) issues.push(makeIssue("DUPLICATE_META_DESCRIPTION", "on-page", "low", "Duplicate meta description", "The same meta description appears on " + group.length + " crawled pages.", "Write a unique description for each important page.", url));
  }
  if (!sitemapFound) issues.push(makeIssue("SITEMAP_NOT_FOUND", "technical", "medium", "XML sitemap not found", "The crawler could not discover URLs from sitemap.xml or a robots.txt sitemap directive.", "Publish an XML sitemap and reference it from robots.txt. This is a discovery aid, not a guarantee of indexing.", startUrl));
  if (pages.length === 0 && !issues.some((issue) => issue.code === "ROBOTS_BLOCKS_START_URL")) {
    issues.push(makeIssue("NO_PAGES_CRAWLED", "technical", "critical", "No pages could be crawled", "The audit did not retrieve any pages from this website.", "Check the website URL, DNS, server availability and robots.txt configuration.", startUrl));
  }

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const issue of issues) severityCounts[issue.severity] += 1;
  const deductions = severityCounts.critical * 12 + severityCounts.high * 8 + severityCounts.medium * 4 + severityCounts.low;
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const [pageSpeed, crux] = await Promise.all([getPageSpeedData(startUrl), getCruxData(origin)]);
  return {
    pages, issues, score, pageCount: pages.length, discoveredUrlCount: visited.size,
    issueCount: issues.length, severityCounts, sitemapFound, robotsTxtFound,
    performance: { pageSpeed, crux },
  };
}

let processingAudit = false;

export async function processQueuedWebsiteAudits() {
  if (processingAudit) return;
  processingAudit = true;
  try {
    const audit = await WebsiteAudit.findOneAndUpdate(
      { status: "queued" },
      { $set: { status: "running", startedAt: new Date(), errorMessage: null } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!audit) return;
    try {
      const result = await runWebsiteAudit({ website: audit.website, maxPages: audit.maxPages });
      audit.pages = result.pages;
      audit.issues = result.issues;
      audit.score = result.score;
      audit.pageCount = result.pageCount;
      audit.discoveredUrlCount = result.discoveredUrlCount;
      audit.issueCount = result.issueCount;
      audit.severityCounts = result.severityCounts;
      audit.sitemapFound = result.sitemapFound;
      audit.robotsTxtFound = result.robotsTxtFound;
      audit.performance = result.performance;
      audit.status = "completed";
      audit.completedAt = new Date();
      await audit.save();
      console.log("Website SEO audit completed:", String(audit._id), "pages:", result.pageCount, "issues:", result.issueCount);
    } catch (error) {
      audit.status = "failed";
      audit.errorMessage = error.message || "The website audit failed.";
      audit.completedAt = new Date();
      await audit.save();
      console.error("Website SEO audit failed:", String(audit._id), error.message);
    }
  } catch (error) {
    console.error("Website SEO queue error:", error.message);
  } finally {
    processingAudit = false;
  }
}
