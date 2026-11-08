# Website SEO — free-provider foundation

This is the first implementation milestone of the SEO module.

## Included now

- Authenticated website audits scoped to the signed-in user's business.
- Same-host crawling from the business website URL and discovered sitemap URLs.
- Reads robots.txt and respects matching User-agent: * / AIMarketingSEO allow/disallow rules.
- HTTP status, HTTPS, page title, meta description, canonical, robots/noindex, H1, viewport, image alt text, word count, internal/external links, structured-data presence, and duplicate metadata checks.
- Google PageSpeed Insights mobile Lighthouse diagnostics for the site's start URL.
- Optional Chrome UX Report (CrUX) field data for LCP, INP and CLS.
- Crawl history and an internal technical-health heuristic.

## No paid provider required

The crawler itself uses Node.js built-in modules and MongoDB. It does not require Cheerio, Playwright, Redis, BullMQ, DataForSEO, SerpApi or any paid keyword database.

PageSpeed Insights can be called with a Google API key; the code also attempts the API without a key. For regular use, configure a key and observe the project's quota.

CrUX requires a Google Cloud API key with the Chrome UX Report API enabled. Google's published CrUX API quota is provided without charge.

Add these optional values to the backend environment:

~~~env
PAGESPEED_API_KEY=
CRUX_API_KEY=
~~~

Do not commit real keys. Configure them in the local backend environment and the Render service environment separately.

## Crawl limits and safety

- Default crawl size: 100 pages; user-selectable 50, 100 or 200.
- Hard maximum: 200 pages per audit.
- At most four page requests run concurrently.
- Each response is capped at 2 MB and requests time out after 12 seconds.
- Redirects must remain on the same hostname and use HTTP or HTTPS standard ports.
- DNS results are checked and private, loopback, link-local, reserved and metadata-style IP ranges are blocked.
- Only one queued/running audit is permitted per business.
- Maximum of three new audit runs per business per UTC day.
- The crawler does not bypass robots.txt rules.
- MongoDB stores the queue; the existing backend process claims one audit at a time. No separate Redis service is required for this first milestone.

## API

- POST /api/seo/businesses/:businessId/audits with { "maxPages": 100 }
- GET /api/seo/businesses/:businessId/audits
- GET /api/seo/audits/:auditId

All routes require the existing Bearer-token authentication. Business ownership is checked server-side.

## Run backend tests

From the Backend directory:

~~~bash
npm install
npm test
~~~

The tests use Node's built-in test runner and do not add a test dependency.

## Current limitations / next free integrations

- This crawler inspects server-delivered HTML. Client-side JavaScript-only rendering may be incomplete.
- Search Console OAuth and its clicks/impressions/query/page performance data are not wired in this milestone.
- Bing Webmaster OAuth/API integration is not wired in this milestone.
- Keyword research and daily SERP tracking are not included yet. Search Console average position is real query performance data, not an exact location-specific rank.
- Competitor and Local SEO workflows are future milestones.
- The internal health score is a transparent heuristic; it is not a Google score or a ranking prediction.
