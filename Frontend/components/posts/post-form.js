"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarClock, CloudUpload, ImageIcon, LoaderCircle, Plus, Save, Send, Trash2 } from "lucide-react";
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
import { MAX_POST_IMAGE_SIZE_BYTES, MAX_POST_MEDIA_ITEMS, uploadPostImage } from "@/lib/api/uploads";
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

export function MediaPreview({ url, className = "h-24 w-24" }) {
  const [failed, setFailed] = useState(false);
  if (!url || !isHttpUrl(url)) return null;
  if (failed) {
    return (
      <div className={"flex " + className + " items-center justify-center rounded-lg bg-sunken px-2 text-center text-xs text-muted"} role="img" aria-label="Image preview unavailable">
        Preview unavailable
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL
    <img
      src={url}
      alt="Media preview"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className + " rounded-lg border border-line object-cover"}
    />
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [draggingFiles, setDraggingFiles] = useState(false);
  const fileInputRef = useRef(null);
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
  const addMedia = () => setValues((v) => (v.mediaUrls.filter((url) => url.trim()).length < MAX_POST_MEDIA_ITEMS ? { ...v, mediaUrls: [...v.mediaUrls, ""] } : v));
  const removeMedia = (i) =>
    setValues((v) => {
      const next = v.mediaUrls.filter((_, idx) => idx !== i);
      return { ...v, mediaUrls: next.length ? next : [""] };
    });

  async function uploadSelectedFiles(fileList) {
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;

    setUploadError("");
    const currentCount = values.mediaUrls.filter((url) => url.trim()).length;
    const availableSlots = Math.max(0, MAX_POST_MEDIA_ITEMS - currentCount);

    if (availableSlots === 0) {
      setUploadError(`A post can contain up to ${MAX_POST_MEDIA_ITEMS} images.`);
      return;
    }

    const candidates = selectedFiles.slice(0, availableSlots);
    const validationMessages = [];

    if (selectedFiles.length > availableSlots) {
      validationMessages.push(`Only ${availableSlots} more image(s) can be added. The first ${availableSlots} file(s) will be processed.`);
    }

    const validFiles = candidates.filter((file) => {
      const fileType = (file.type || "").toLowerCase();
      const extension = (file.name || "").split(".").pop().toLowerCase();
      const supportedType = !fileType || ["image/jpeg", "image/png"].includes(fileType);
      const supportedExtension = ["jpg", "jpeg", "png"].includes(extension);

      if (!supportedType || !supportedExtension) {
        validationMessages.push(file.name + ": unsupported format. Choose a JPG or PNG image.");
        return false;
      }
      if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
        validationMessages.push(file.name + ": image must be 8 MB or smaller.");
        return false;
      }
      return true;
    });

    if (!validFiles.length) {
      setUploadError(validationMessages.join(" ") || "Choose a JPG or PNG image no larger than 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.allSettled(
        validFiles.map((file) => uploadPostImage(file, values.businessId))
      );

      const uploadedUrls = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.url);

      if (uploadedUrls.length) {
        setValues((current) => {
          const currentMedia = current.mediaUrls.map((url) => url.trim()).filter(Boolean);
          const remainingSlots = Math.max(0, MAX_POST_MEDIA_ITEMS - currentMedia.length);
          return {
            ...current,
            mediaUrls: [...currentMedia, ...uploadedUrls.slice(0, remainingSlots)],
          };
        });
        toast.success(
          uploadedUrls.length === 1 ? "Image uploaded" : `${uploadedUrls.length} images uploaded`,
          { message: "Images are stored securely in Cloudinary." }
        );
      }

      const failedUploads = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message || "An image couldn't be uploaded.");

      const messages = [...validationMessages, ...failedUploads];
      setUploadError(messages.join(" "));
    } finally {
      setUploading(false);
    }
  }

  function handleFileInputChange(event) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    uploadSelectedFiles(files);
  }

  function handleFileDrop(event) {
    event.preventDefault();
    setDraggingFiles(false);
    if (!uploading && !busy) uploadSelectedFiles(event.dataTransfer.files);
  }

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
              disabled={editing || uploading || Boolean(busy)}
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
          <CardHeader title="Media" description="Upload JPG or PNG images to Cloudinary, or paste a public image URL. Instagram requires at least one image." />
          <CardBody className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={uploading || Boolean(busy) || values.mediaUrls.filter((url) => url.trim()).length >= MAX_POST_MEDIA_ITEMS}
              onChange={handleFileInputChange}
              aria-label="Choose images to upload"
            />

            <div
              role="button"
              tabIndex={uploading || busy || values.mediaUrls.filter((url) => url.trim()).length >= MAX_POST_MEDIA_ITEMS ? -1 : 0}
              aria-disabled={uploading || Boolean(busy) || values.mediaUrls.filter((url) => url.trim()).length >= MAX_POST_MEDIA_ITEMS}
              onClick={() => {
                if (!uploading && !busy && values.mediaUrls.filter((url) => url.trim()).length < MAX_POST_MEDIA_ITEMS) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !uploading && !busy) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading && !busy) setDraggingFiles(true);
              }}
              onDragLeave={() => setDraggingFiles(false)}
              onDrop={handleFileDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${draggingFiles ? "border-brand-600 bg-brand-50" : "border-line-strong bg-canvas hover:border-brand-500"} ${uploading || busy || values.mediaUrls.filter((url) => url.trim()).length >= MAX_POST_MEDIA_ITEMS ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <CloudUpload className="mb-2 h-7 w-7 text-brand-700" aria-hidden />
              <p className="text-sm font-semibold">Drag images here or browse files</p>
              <p className="mt-1 text-xs text-muted">JPG or PNG · 8 MB max per image · up to {MAX_POST_MEDIA_ITEMS} images</p>
            </div>

            {uploading && (
              <p role="status" className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Uploading images to Cloudinary…
              </p>
            )}
            {uploadError && <Alert tone="danger" title="Some images couldn't be added">{uploadError}</Alert>}

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
                  {url.trim() && isHttpUrl(url.trim()) && (
                    <div className="mt-2 flex items-center gap-3">
                      <MediaPreview key={url} url={url.trim()} />
                      <span className="text-xs text-muted">Image {i + 1} preview</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => removeMedia(i)} aria-label={`Remove media URL ${i + 1}`} disabled={uploading || Boolean(busy)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={addMedia} disabled={uploading || Boolean(busy) || values.mediaUrls.filter((url) => url.trim()).length >= MAX_POST_MEDIA_ITEMS}>
                <Plus className="h-4 w-4" aria-hidden /> Add another URL
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden /> You can also paste a publicly accessible image URL.
              </span>
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
          {onCancel && <Button variant="ghost" onClick={onCancel} disabled={Boolean(busy) || uploading}>Cancel</Button>}
          <Button variant="secondary" onClick={saveDraft} loading={busy === "draft"} disabled={Boolean(busy) || uploading}>
            <Save className="h-4 w-4" aria-hidden /> {editing || postId ? "Save changes" : "Save as draft"}
          </Button>
          {canSchedule && (
            <Button variant="secondary" onClick={() => startConfirm("schedule")} disabled={Boolean(busy) || uploading}>
              <CalendarClock className="h-4 w-4" aria-hidden /> {post?.status === "scheduled" ? "Reschedule" : "Schedule"}
            </Button>
          )}
          <Button onClick={() => startConfirm("publish")} disabled={Boolean(busy) || uploading}>
            <Send className="h-4 w-4" aria-hidden /> {post?.status === "failed" ? "Retry publishing" : "Publish now"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Preview" />
          <CardBody className="space-y-3">
            <PlatformBadges platforms={values.platforms} />
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {mediaList.slice(0, 4).map((url, index) => (
                  <MediaPreview key={url + "-" + index} url={url} className="h-28 w-full" />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Add an image to see its preview here.</p>
            )}
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
