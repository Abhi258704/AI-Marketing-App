"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarX2, Pencil, RefreshCw, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useBusiness } from "@/components/providers/business-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PostForm } from "@/components/posts/post-form";
import { PlatformBadges, PostStatusBadge } from "@/components/posts/post-badges";
import { PublicationList, PublishOutcome } from "@/components/posts/publication-results";
import { usePublicationRecords } from "@/components/posts/use-publication-record";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Alert, CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useApi } from "@/lib/use-api";
import { cancelScheduledPost, deletePost, getPost } from "@/lib/api/posts";
import { getErrorMessage } from "@/lib/api/client";
import { publishPostSafely, schedulePostAt } from "@/lib/post-actions";
import {
  canCancelPost,
  canDeletePost,
  canEditPost,
  canSchedulePost,
  effectiveStatus,
  platformLabel,
  POST_TYPES,
  validatePost,
} from "@/lib/post-rules";
import { getTimeZoneName, isTooSoon, localInputToIso, minScheduleInputValue, toLocalInputValue } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

const STATUS_NOTES = {
  processing: "This post is being published right now. Results appear after the platforms respond. Refresh in a minute.",
  scheduled: "The backend checks for due posts every minute, so publishing can lag the chosen time slightly.",
  failed: "Publishing failed. Review the details below, fix the cause (e.g. reconnect an account or add an image) and retry.",
  partially_published: "Published on some platforms but not others. Retrying only targets platforms that haven't succeeded.",
};

export default function PostDetailPage({ params }) {
  const { postId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { businesses } = useBusiness();
  const { data, loading, error, reload } = useApi(() => getPost(postId), [postId]);
  const post = data?.post;

  const [version, setVersion] = useState(0);
  const records = usePublicationRecords(post ? [post] : [], version);
  const record = post ? records[post._id] : null;
  const eff = post ? effectiveStatus(post, record) : null;

  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState(null); // publish | schedule | cancel | delete
  const [busy, setBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleError, setScheduleError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const timeZone = getTimeZoneName();

  // While the scheduler is working on it, check back periodically.
  const processing = post?.status === "processing";
  useEffect(() => {
    if (!processing) return undefined;
    const t = setInterval(reload, 15_000);
    return () => clearInterval(t);
  }, [processing, reload]);

  if (loading && !data) return <CardSkeleton lines={8} />;
  if (error) {
    return (
      <>
        <BackLink />
        <ErrorState error={error} onRetry={reload} title={error.status === 404 ? "Post not found" : "Couldn't load this post"} />
      </>
    );
  }
  if (!post) return null;

  const businessName = businesses.find((b) => b._id === post.businessId)?.name || "Disabled business";
  const status = eff.status;
  const publishable = ["draft", "failed", "partially_published"].includes(post.status) && status !== "published";

  async function run(fn, { successTitle, close = true } = {}) {
    setBusy(true);
    try {
      await fn();
      if (successTitle) toast.success(successTitle);
      if (close) setDialog(null);
      reload();
    } catch (e) {
      toast.error("Action failed", { message: getErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  function openPublish() {
    const { errors } = validatePost(
      { businessId: post.businessId, content: post.content, mediaUrls: post.mediaUrls, platforms: post.platforms },
      "publish"
    );
    const first = Object.values(errors)[0];
    if (first) {
      toast.error("This post can't be published yet", { message: `${first} Edit the post to fix it.` });
      return;
    }
    setDialog("publish");
  }

  async function doPublish() {
    setBusy(true);
    try {
      const result = await publishPostSafely({ post, userId: user.id });
      setDialog(null);
      setVersion((v) => v + 1);
      setOutcome(result);
      reload();
    } catch (e) {
      setDialog(null);
      toast.error("Publishing didn't complete", {
        message: `${getErrorMessage(e)}${e?.status === 0 ? " The outcome is unknown. Check Facebook/Instagram before retrying to avoid a duplicate." : ""}`,
      });
    } finally {
      setBusy(false);
    }
  }

  function openSchedule() {
    setScheduleAt(post.scheduledAt ? toLocalInputValue(post.scheduledAt) : "");
    setScheduleError(null);
    setDialog("schedule");
  }

  function doSchedule() {
    const iso = localInputToIso(scheduleAt);
    if (!iso) return setScheduleError("Choose a date and time.");
    if (isTooSoon(iso)) return setScheduleError("Pick a time at least a minute in the future.");
    const { errors } = validatePost(
      { businessId: post.businessId, content: post.content, mediaUrls: post.mediaUrls, platforms: post.platforms },
      "schedule"
    );
    const first = Object.values(errors)[0];
    if (first) return setScheduleError(`${first} Edit the post first.`);
    setScheduleError(null);
    run(() => schedulePostAt(post._id, iso), { successTitle: "Post scheduled" });
  }

  if (editing) {
    return (
      <>
        <BackLink />
        <PageHeader title="Edit post" description={`${businessName} · ${PostStatusLabel(status)}`} />
        <PostForm post={post} onDone={() => { setEditing(false); reload(); }} onCancel={() => setEditing(false)} />
      </>
    );
  }

  const typeLabel = POST_TYPES.find((t) => t.id === post.postType)?.label || post.postType;
  const items = Object.values(record?.items || {});

  return (
    <>
      <BackLink />
      <PageHeader
        eyebrow={businessName}
        title={post.title || "Untitled post"}
        description={undefined}
        actions={
          <>
            <Button variant="ghost" onClick={reload} aria-label="Refresh"><RefreshCw className="h-4 w-4" aria-hidden /></Button>
            {canEditPost(post) && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button>}
            {canSchedulePost(post) && status !== "published" && (
              <Button variant="secondary" onClick={openSchedule}><CalendarClock className="h-4 w-4" aria-hidden /> {post.status === "scheduled" ? "Reschedule" : "Schedule"}</Button>
            )}
            {canCancelPost(post) && <Button variant="secondary" onClick={() => setDialog("cancel")}><CalendarX2 className="h-4 w-4" aria-hidden /> Cancel schedule</Button>}
            {publishable && (
              <Button onClick={openPublish}><Send className="h-4 w-4" aria-hidden /> {post.status === "draft" ? "Publish now" : "Retry publishing"}</Button>
            )}
          </>
        }
      />

      {STATUS_NOTES[status] && (
        <Alert tone={status === "failed" ? "danger" : status === "partially_published" ? "warning" : "info"} className="mb-4">
          {STATUS_NOTES[status]}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Content" />
            <CardBody className="space-y-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{post.content}</p>
              {post.mediaUrls?.length > 0 && (
                <ul className="space-y-1.5 border-t border-line pt-4 text-sm">
                  {post.mediaUrls.map((u) => (
                    <li key={u} className="truncate"><a href={u} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">{u}</a></li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Publication results"
              description={items.length ? "From publish attempts made in this browser." : undefined}
            />
            <CardBody>
              {items.length > 0 ? (
                <div className="space-y-3">
                  <PublicationList items={items} />
                  <p className="text-xs text-muted">Results are kept in this browser because the API can&apos;t list a post&apos;s publications yet. Posts published by the scheduler or from another device won&apos;t appear here.</p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {status === "published"
                    ? "This post is marked published. Per-platform details aren't available from the API."
                    : status === "partially_published" || status === "failed"
                      ? "Per-platform details aren't available from the API for scheduler-run posts. Use Retry publishing to see each platform's current state."
                      : "No publish attempts have been made from this browser."}
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="divide-y divide-line text-sm">
              <Row label="Status"><PostStatusBadge status={status} derived={eff.derived} /></Row>
              <Row label="Platforms"><PlatformBadges platforms={post.platforms} /></Row>
              <Row label="Type">{typeLabel}</Row>
              <Row label="Scheduled for">{post.scheduledAt ? `${formatDateTime(post.scheduledAt)}` : "—"}</Row>
              <Row label="Created">{formatDateTime(post.createdAt)}</Row>
              <Row label="Updated">{formatDateTime(post.updatedAt)}</Row>
            </dl>
            {post.scheduledAt && <p className="border-t border-line px-5 py-2.5 text-xs text-muted">Shown in {timeZone}.</p>}
            {eff.derived && <p className="border-t border-line px-5 py-2.5 text-xs text-muted">* Derived from results received in this browser; the backend didn&apos;t update this post&apos;s status.</p>}
          </Card>
          {canDeletePost(post) && (
            <Button variant="danger-outline" className="w-full" onClick={() => setDialog("delete")}><Trash2 className="h-4 w-4" aria-hidden /> Delete post</Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        onConfirm={doPublish}
        loading={busy}
        title={post.status === "draft" ? "Publish this post now?" : "Retry publishing?"}
        confirmLabel={post.status === "draft" ? "Publish now" : "Retry"}
      >
        <p>This posts publicly to <strong>{post.platforms.map(platformLabel).join(" and ")}</strong>.</p>
        {post.status !== "draft" && <p>Platforms that already published successfully are skipped, so they won&apos;t be posted twice.</p>}
        <p>Keep this tab open until you see the result.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => cancelScheduledPost(post._id), { successTitle: "Schedule cancelled. Moved back to drafts" })}
        loading={busy}
        title="Cancel this scheduled post?"
        confirmLabel="Cancel schedule"
      >
        <p>The post returns to drafts and won&apos;t be published unless you schedule it again.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={() => run(async () => { await deletePost(post._id); toast.success("Post deleted"); router.replace("/posts"); }, { close: false })}
        loading={busy}
        tone="danger"
        title="Delete this post?"
        confirmLabel="Delete post"
      >
        <p>This permanently removes the post from your account.</p>
        {["published", "partially_published"].includes(status) && <p className="text-amber-800">It will <strong>not</strong> be removed from Facebook or Instagram. Delete it there separately.</p>}
      </ConfirmDialog>

      <Modal
        open={dialog === "schedule"}
        onClose={() => setDialog(null)}
        title={post.status === "scheduled" ? "Reschedule post" : "Schedule post"}
        description={`Times use your local timezone (${timeZone}).`}
        busy={busy}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button onClick={doSchedule} loading={busy}>Schedule</Button>
          </>
        }
      >
        <Input label="Publish at" type="datetime-local" value={scheduleAt} min={minScheduleInputValue()} onChange={(e) => setScheduleAt(e.target.value)} error={scheduleError} />
        {scheduleAt && localInputToIso(scheduleAt) && !scheduleError && (
          <p className="mt-2 text-xs text-muted">{formatDateTime(localInputToIso(scheduleAt))} {timeZone}</p>
        )}
      </Modal>

      <Modal open={Boolean(outcome)} onClose={() => setOutcome(null)} title="Publishing result" footer={<Button onClick={() => setOutcome(null)}>Done</Button>}>
        {outcome && <PublishOutcome result={outcome} />}
      </Modal>
    </>
  );
}

const PostStatusLabel = (s) => s.replace("_", " ");

function BackLink() {
  return (
    <Link href="/posts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden /> All posts
    </Link>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
