"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarClock, ImageIcon, Plus, Save, Send, Trash2 } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Badge } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { PublishOutcome } from "./publication-results";
import { PlatformBadges } from "./post-badges";
import { useApi } from "@/lib/use-api";
import { listSocialAccounts } from "@/lib/api/social-accounts";
import { getErrorMessage } from "@/lib/api/client";
import { publishPostSafely, savePost, schedulePostAt } from "@/lib/post-actions";
import {
  INSTAGRAM_CAPTION_LIMIT,
  PLATFORMS,
  POST_TYPES,
  canSchedulePost,
  isHttpUrl,
  platformLabel,
  validatePost,
} from "@/lib/post-rules";
import { getTimeZoneName, isTooSoon, localInputToIso, minScheduleInputValue, toLocalInputValue } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

function initialValues(post, defaultBusinessId) {
  return {
    businessId: post?.businessId || defaultBusinessId || "",
    title: post?.title || "",
    content: post?.content || "",
    mediaUrls: post?.mediaUrls?.length ? post.mediaUrls : [""],
    postType: post?.postType || "social_post",
    platforms: post?.platforms || ["facebook", "instagram"],
  };
}

function MediaPreview({ url }) {
  const [failed, setFailed] = useState(false);
  if (!url || !isHttpUrl(url)) return null;
  if (failed) {
    return <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-sunken text-xs text-muted">Can&apos;t preview</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL
    <img src={url} alt="Media preview" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-24 w-24 rounded-lg border border-line object-cover" />
  );
}

/**
 * Create / edit post.
 * `post` present => edit mode. `onDone(post)` is called after a successful save/schedule/publish flow.
 */
export function PostForm({ post, defaultBusinessId, onDone, onCancel }) {
  const { user } = useAuth();
  const { businesses } = useBusiness();
  const toast = useToast();

  const [values, setValues] = useState(() => initialValues(post, defaultBusinessId));
  const [scheduleAt, setScheduleAt] = useState(() => (post?.scheduledAt ? toLocalInputValue(post.scheduledAt) : ""));
  const [postId, setPostId] = useState(post?._id || null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null); // "draft" | "publish" | "schedule"
  const [confirm, setConfirm] = useState(null); // "publish" | "schedule"
  const [outcome, setOutcome] = useState(null);
  const [formError, setFormError] = useState(null);
  const lockRef = useRef(false); // prevents double submits (and duplicate public posts)

  const editing = Boolean(post);
  const canSchedule = !editing || canSchedulePost(post);
  const timeZone = getTimeZoneName();

  const { data: accountsData } = useApi(
    () => (values.businessId ? listSocialAccounts(values.businessId) : Promise.resolve({ socialAccounts: [] })),
    [values.businessId]
  );
  const connected = useMemo(
    () => new Set((accountsData?.socialAccounts || []).filter((a) => a.status === "connected").map((a) => a.platform)),
    [accountsData]
  );
  const accountsKnown = Boolean(accountsData);
  const missing = values.platforms.filter((p) => !connected.has(p));

  const live = validatePost(values, "draft");
  const mediaList = values.mediaUrls.map((u) => u.trim()).filter(Boolean);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const togglePlatform = (id) =>
    setValues((v) => ({
      ...v,
      platforms: v.platforms.includes(id) ? v.platforms.filter((p) => p !== id) : [...v.platforms, id],
    }));
  const setMedia = (i, value) =>
    setValues((v) => ({ ...v, mediaUrls: v.mediaUrls.map((m, idx) => (idx === i ? value : m)) }));
  const addMedia = () => setValues((v) => (v.mediaUrls.length < 10 ? { ...v, mediaUrls: [...v.mediaUrls, ""] } : v));
  const removeMedia = (i) =>
    setValues((v) => {
      const next = v.mediaUrls.filter((_, idx) => idx !== i);
      return { ...v, mediaUrls: next.length ? next : [""] };
    });

  function check(intent) {
    const { errors: found } = validatePost(values, intent);
    if (intent === "schedule") {
      const iso = localInputToIso(scheduleAt);
      if (!scheduleAt || !iso) found.scheduleAt = "Choose a date and time.";
      else if (isTooSoon(iso)) found.scheduleAt = "Pick a time at least a minute in the future.";
    }
    if (intent === "publish" && accountsKnown && values.platforms.length > 0 && missing.length === values.platforms.length) {
      found.platforms = `${missing.map(platformLabel).join(" and ")} ${missing.length > 1 ? "aren't" : "isn't"} connected. Connect an account first.`;
    }
    setErrors(found);
    setFormError(null);
    return Object.keys(found).length === 0;
  }

  async function run(intent, work) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(intent);
    setFormError(null);
    let saved = null;
    try {
      saved = await savePost({ postId, values });
      setPostId(saved._id);
      await work(saved);
    } catch (e) {
      if (saved) {
        setFormError(
          `Your post was saved as a draft, but the next step failed: ${getErrorMessage(e)}${
            intent === "publish" && e?.status === 0 ? " The publish outcome is unknown. Check the post's details before retrying." : ""
          }`
        );
      } else {
        setFormError(getErrorMessage(e, "Couldn't save the post."));
      }
      setConfirm(null);
    } finally {
      lockRef.current = false;
      setBusy(null);
    }
  }

  const saveDraft = () => {
    if (!check("draft")) return;
    run("draft", async (saved) => {
      toast.success(editing || postId ? "Changes saved" : "Draft saved");
      onDone?.(saved);
    });
  };

  const startConfirm = (intent) => {
    if (check(intent)) setConfirm(intent);
  };

  const doPublish = () =>
    run("publish", async (saved) => {
      setConfirm(null);
      const result = await publishPostSafely({ post: { ...saved, platforms: values.platforms }, userId: user.id });
      setOutcome({ result, post: saved });
    });

  const doSchedule = () =>
    run("schedule", async (saved) => {
      const updated = await schedulePostAt(saved._id, localInputToIso(scheduleAt));
      setConfirm(null);
      toast.success("Post scheduled", { message: `Will publish ${formatDateTime(updated.scheduledAt)}.` });
      onDone?.(updated);
    });

  const scheduleIso = localInputToIso(scheduleAt);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
        {formError && <Alert tone="danger" title="Something went wrong">{formError}</Alert>}

        <Card>
          <CardHeader title="Content" />
          <CardBody className="space-y-5">
            <Select
              label="Business"
              required
              value={values.businessId}
              onChange={set("businessId")}
              disabled={editing}
              error={errors.businessId}
              hint={editing ? "A post's business can't be changed after it's created." : undefined}
            >
              <option value="" disabled>Select a business</option>
              {businesses.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </Select>

            <Input label="Title" value={values.title} onChange={set("title")} error={errors.title} maxLength={120} hint="Internal label. It isn't published, but it appears in notifications." />

            <div>
              <Textarea
                label="Caption / content"
                required
                rows={9}
                value={values.content}
                onChange={set("content")}
                error={errors.content}
                placeholder="Write the post exactly as it should appear…"
              />
              <p className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
                <span>{values.content.trim().length} characters</span>
                {values.platforms.includes("instagram") && (
                  <span className={values.content.trim().length > INSTAGRAM_CAPTION_LIMIT ? "font-medium text-red-700" : ""}>
                    Instagram limit {INSTAGRAM_CAPTION_LIMIT}
                  </span>
                )}
              </p>
            </div>

            <Select label="Post type" value={values.postType} onChange={set("postType")}>
              {POST_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Platforms" description="Where this post will be published." />
          <CardBody className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="sr-only">Platforms</legend>
              {PLATFORMS.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <Checkbox label={p.label} checked={values.platforms.includes(p.id)} onChange={() => togglePlatform(p.id)} />
                  {accountsKnown && (
                    <Badge tone={connected.has(p.id) ? "success" : "warning"}>
                      {connected.has(p.id) ? "Connected" : "Not connected"}
                    </Badge>
                  )}
                </div>
              ))}
            </fieldset>
            {errors.platforms && <p role="alert" className="text-xs font-medium text-red-700">{errors.platforms}</p>}
            {accountsKnown && missing.length > 0 && values.platforms.length > 0 && (
              <Alert tone="warning">
                {missing.map(platformLabel).join(" and ")} {missing.length > 1 ? "aren't" : "isn't"} connected for this business, so publishing there will be skipped or fail. Connect it on the Social accounts page.
              </Alert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Media" description="Public image URLs. Instagram requires one; Facebook posts are text-only for now." />
          <CardBody className="space-y-4">
            {values.mediaUrls.map((url, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={`Media URL ${i + 1}`}
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(e) => setMedia(i, e.target.value)}
                    error={i === 0 ? errors.mediaUrls : undefined}
                  />
                </div>
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => removeMedia(i)} aria-label={`Remove media URL ${i + 1}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={addMedia} disabled={values.mediaUrls.length >= 10}>
                <Plus className="h-4 w-4" aria-hidden /> Add another URL
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted"><ImageIcon className="h-3.5 w-3.5" aria-hidden /> File upload isn&apos;t available yet. Host your image and paste its link.</span>
            </div>
          </CardBody>
        </Card>

        {live.warnings.length > 0 && (
          <Alert tone="info" title="Heads up">
            <ul className="list-disc space-y-0.5 pl-4">{live.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </Alert>
        )}

        {canSchedule && (
          <Card>
            <CardHeader title="Schedule" description={`Times use your local timezone (${timeZone}).`} />
            <CardBody className="space-y-3">
              <Input
                label="Publish at"
                type="datetime-local"
                value={scheduleAt}
                min={minScheduleInputValue()}
                onChange={(e) => setScheduleAt(e.target.value)}
                error={errors.scheduleAt}
                hint="Posts are checked every minute, so publishing can lag the chosen time by up to about a minute."
              />
              {scheduleIso && !errors.scheduleAt && (
                <p className="text-xs text-muted">That&apos;s {formatDateTime(scheduleIso)} {timeZone} · {new Date(scheduleIso).toUTCString()}</p>
              )}
            </CardBody>
          </Card>
        )}

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-surface">
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={Boolean(busy)}>Cancel</Button>}
          <Button variant="secondary" onClick={saveDraft} loading={busy === "draft"} disabled={Boolean(busy)}>
            <Save className="h-4 w-4" aria-hidden /> {editing || postId ? "Save changes" : "Save as draft"}
          </Button>
          {canSchedule && (
            <Button variant="secondary" onClick={() => startConfirm("schedule")} disabled={Boolean(busy)}>
              <CalendarClock className="h-4 w-4" aria-hidden /> {post?.status === "scheduled" ? "Reschedule" : "Schedule"}
            </Button>
          )}
          <Button onClick={() => startConfirm("publish")} disabled={Boolean(busy)}>
            <Send className="h-4 w-4" aria-hidden /> {post?.status === "failed" ? "Retry publishing" : "Publish now"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Preview" />
          <CardBody className="space-y-3">
            <PlatformBadges platforms={values.platforms} />
            {mediaList[0] && <MediaPreview url={mediaList[0]} />}
            {values.content.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{values.content}</p>
            ) : (
              <p className="text-sm text-muted">Your post will appear here as you type.</p>
            )}
          </CardBody>
        </Card>
      </aside>

      <ConfirmDialog
        open={confirm === "publish"}
        onClose={() => setConfirm(null)}
        onConfirm={doPublish}
        loading={busy === "publish"}
        title="Publish this post now?"
        confirmLabel="Publish now"
      >
        <p>This posts publicly to <strong>{values.platforms.map(platformLabel).join(" and ")}</strong> right away. Published posts can&apos;t be unpublished from here.</p>
        {accountsKnown && missing.length > 0 && <p className="text-amber-800">{missing.map(platformLabel).join(" and ")} {missing.length > 1 ? "aren't" : "isn't"} connected and will be skipped.</p>}
        <p>Don&apos;t close this tab until you see the result. Instagram can take up to ~20 seconds.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "schedule"}
        onClose={() => setConfirm(null)}
        onConfirm={doSchedule}
        loading={busy === "schedule"}
        title="Schedule this post?"
        confirmLabel="Schedule"
      >
        {scheduleIso && (
          <p>
            It will publish to <strong>{values.platforms.map(platformLabel).join(" and ")}</strong> on{" "}
            <strong>{formatDateTime(scheduleIso)}</strong> ({timeZone}).
          </p>
        )}
        <p>You can cancel or reschedule it any time before then.</p>
      </ConfirmDialog>

      <Modal
        open={Boolean(outcome)}
        onClose={() => {
          const p = outcome?.post;
          setOutcome(null);
          if (p) onDone?.(p);
        }}
        title="Publishing result"
        footer={<Button onClick={() => { const p = outcome?.post; setOutcome(null); if (p) onDone?.(p); }}>Done</Button>}
      >
        {outcome && <PublishOutcome result={outcome.result} />}
      </Modal>
    </div>
  );
}
