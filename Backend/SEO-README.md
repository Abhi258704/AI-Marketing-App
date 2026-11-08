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
- Maximum of ten new audit runs per business per UTC day.
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
- Google Search Console OAuth and performance reports are provided on a separate page; see the integration setup below.
- Bing Webmaster OAuth/API integration is not wired in this milestone.
- Keyword research and daily SERP tracking are not included yet. Search Console average position is real query performance data, not an exact location-specific rank.
- Competitor and Local SEO workflows are future milestones.
- The internal health score is a transparent heuristic; it is not a Google score or a ranking prediction.


## Google Search Console integration

The Search Console connection is a separate OAuth flow from Google sign-in. It requests read-only access through the Google Search Console webmasters.readonly scope, plus openid and email to identify the connected Google account. Refresh tokens are encrypted with AES-256-GCM before being stored in MongoDB.

### Backend environment variables

Add these values to both the local backend environment and the Render backend service. Never place the client secret or encryption key in the frontend environment or commit them to Git.

~~~env
GOOGLE_CLIENT_ID=your-existing-google-oauth-web-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-web-client-secret
GOOGLE_SEARCH_CONSOLE_REDIRECT_URI=https://YOUR-RENDER-SERVICE/api/seo/search-console/callback
FRONTEND_URL=https://YOUR-VERCEL-FRONTEND
GSC_TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-random-key
~~~

For local development, use http://localhost:8000/api/seo/search-console/callback as the redirect URI and http://localhost:3000 as FRONTEND_URL. The redirect URI must match exactly in the Google OAuth web client settings. Add both local and production callback URLs to the same Google OAuth client when using both environments.

Generate a new encryption key once and keep the same value for local/production environments that share the same MongoDB records:

~~~bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
~~~

If the encryption key is lost or changed, existing encrypted refresh tokens cannot be decrypted and users must reconnect their Google accounts.

### Google Cloud setup

1. Enable the Google Search Console API in the Google Cloud project used by the OAuth web client.
2. In the OAuth client, add the exact callback URL above under Authorized redirect URIs.
3. Configure the OAuth consent screen with the app name, support email, privacy policy and the requested scopes.
4. Add your Google account as a test user while the app is in Testing mode.
5. Confirm your Google account has access to a verified Search Console property for the business website.

Google may require OAuth verification for sensitive scopes before general public use. Testing-mode apps are restricted to configured test users and have limited refresh-token lifetime. Review Google's current verification requirements before making this integration available to external customers.

### Report behavior

- Selects only a property returned by the connected Google account and matching the current business website.
- Supports domain properties such as sc-domain:example.com and URL-prefix properties.
- Requests web search performance grouped by date, query, page, country and device, plus totals.
- Default report range is the last 28 completed days, ending three days before the current UTC date to avoid the usual processing delay.
- Reports are cached for six hours; users can explicitly refresh them.
- The Search Analytics API may omit some low-volume or anonymized query rows and does not guarantee every possible data row.
- Average position is an aggregate metric, not an exact current rank for an individual keyword.
- Disconnecting deletes the stored refresh token, selected properties and report cache for the current app user.
