# Backend gaps found while building the frontend

The frontend was built strictly against the existing API. These are the places where the backend limits what the UI can do correctly, how the frontend works around each, and a suggested fix. Nothing in `Backend/` was modified.

## Correctness / safety (recommended soon)

1. **`POST /api/publish` can double-post.** It loops over *all* publications for the requested platforms and publishes them even if `status === "published"` (the scheduler skips these; this controller doesn't). Calling it twice for the same post posts publicly twice.
   *Workaround:* the UI only calls it for a never-published draft; all retries go through `POST /api/post-publications` + `/api/facebook|instagram/publish/:id`, which only act on `pending`/`failed`.
   *Fix:* add `if (publication.status === "published") continue;` in both loops of `publish.controller.js`.

2. **Manual publish never updates `post.status`.** After a successful publish the post still reads `draft`; scheduler-failed posts stay `failed` after a successful retry.
   *Workaround:* status is derived from locally stored results and marked with `*`.
   *Fix:* after the publication loops, compute `published` / `partially_published` / `failed` as `scheduler.service.js` does and save it.

3. **Facebook OAuth isn't tied to the user.** `GET /api/facebook/connect` doesn't verify the business belongs to the caller, and uses the raw `businessId` as `state` (Instagram uses a signed, expiring JWT). The unauthenticated callback then writes a page token to whichever `businessId` is in `state`.
   *Fix:* mirror the Instagram flow: check ownership and sign `state` with `jwt.sign({businessId,userId,nonce})`, verify it in the callback.

4. **`Backend/node_modules` is committed** (1,855 files). Add `node_modules/` to the root `.gitignore` and run `git rm -r --cached Backend/node_modules`.

## Missing endpoints (UI degrades gracefully)

| Need | Today | Suggested |
| --- | --- | --- |
| Publication results for a post | Only the response of `POST /api/publish`; not retrievable later (scheduler results invisible) | `GET /api/posts/:postId/publications` |
| Audit history / latest audit per business | None; recommendations are reachable only by `auditId` | `GET /api/ai/business-audit?businessId=` (or `/api/audits/business/:id`) |
| List disabled businesses | `GET /api/businesses` returns only `isActive: true`, so a disabled business can't be re-enabled from a list | `?includeInactive=true` |
| Notification deep links | Notifications carry only `businessId`; no `postId`/`auditId` | add `entityType` + `entityId` |
| Date filtering/pagination for posts | `GET /api/posts` returns everything | `businessId`, `status`, `from`, `to`, `page` query params |
| Image upload | None; UI takes public URLs | upload endpoint (S3/Cloudinary) |
| Facebook media posts | `createFacebookPost` sends text only; `mediaUrls` ignored for Facebook | use `/photos` when `mediaUrls` is present |

## Analytics semantics

- `page_follows` is a running total, so the summary endpoint's `$sum` over days is meaningless for it. The UI shows the latest daily value instead.
- Instagram windows from different sync days overlap (`periodStart` differs per sync), so summing them double counts. The UI shows windows individually and never adds them.
- *Suggestion:* store Instagram windows with a fixed key (e.g. window end date) or exclude non-additive metrics from `/summary`.

## Small notes

- `PATCH /api/businesses/:id` sets fields from the body without `isActive` protection; fine today, but validate server-side (`website`/`logoUrl` URLs, name length).
- Scheduling and publishing depend on the in-process `setInterval` scheduler, which stops when the server restarts or scales to multiple instances.
