# AI Marketing Platform: Frontend

Next.js (App Router, JavaScript) + Tailwind CSS v4 client for the Express/MongoDB backend in `../Backend`.

## Run locally

```bash
cd Frontend
cp .env.example .env.local      # then edit the values
npm install
npm run dev                     # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL (default `http://localhost:8000`). Change for deployment. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth **Web** client ID. Must match the backend's `GOOGLE_CLIENT_ID`. Add `http://localhost:3000` to the client's *Authorized JavaScript origins*. |

Both are public values. Never put client secrets, JWT secrets or tokens in `NEXT_PUBLIC_*` variables. `.env*` is git-ignored (only `.env.example` is tracked).

Other commands: `npm run lint`, `npm run build`, `npm start`.

## Structure

```
app/
  login/                  Google sign-in
  (app)/                  Protected area (AuthGate + shell)
    dashboard, businesses[/new|/[id]], social-accounts, content-studio,
    posts[/new|/[id]], calendar, audits, recommendations, analytics,
    notifications, settings
components/
  ui/         Button, form fields, Card, Modal/ConfirmDialog, feedback (Alert, Badge, Skeleton, EmptyState)
  layout/     AppShell, sidebar, top bar, business switcher, notification bell, user menu
  providers/  Auth, Business (active business), Notifications, Toast
  posts/ business/ audits/ analytics/   feature components
lib/
  api/        One module per backend area, all built on api/client.js
  post-rules.js, post-actions.js, analytics.js, datetime.js, local-store.js, ...
```

## Authentication & security notes

- Sign-in: Google ID token → `POST /api/auth/google` → backend JWT (7 days).
- The backend only accepts `Authorization: Bearer <jwt>` and has no cookie sessions or refresh tokens, so the JWT is kept in `localStorage` (`aimp.token`). **Trade-off:** any XSS could read it. Mitigations: no `dangerouslySetInnerHTML`, no third-party scripts except Google Sign-In, tokens never logged, automatic sign-out on expiry or any 401. Moving to httpOnly cookies would need backend changes.
- Social-platform access tokens never reach the frontend (the API strips them).
- The backend is the security boundary; the UI only lists/uses what the API returns for the signed-in user.

## Data kept in the browser (and why)

The API can't currently return some data later, so results of **your own requests** are cached in `localStorage`, scoped per user (`aimp.v1:<userId>:…`):

- publish results per post, audit history per business, active business, businesses you disabled.

These are conveniences, not a source of truth, and contain no secrets. *Settings → Clear data stored in this browser* removes them. See `BACKEND_GAPS.md` for the backend changes that would make this unnecessary.

## What isn't built (and why)

Google Business Profile (API access pending), reviews, SEO keyword rankings, image upload, and real-time push have no backend support; they appear as clearly labelled "coming soon / unavailable" rather than faked. See `BACKEND_GAPS.md`.
