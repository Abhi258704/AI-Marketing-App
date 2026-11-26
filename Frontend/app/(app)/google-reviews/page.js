"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, RefreshCw, Star, ExternalLink, Sparkles, Copy, Check, X, Globe2 } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import {
  generateGoogleBusinessReviewReplyDraft,
  listGoogleBusinessReviewReplyDrafts,
  saveGoogleBusinessReviewReplyDraft,
  publishGoogleBusinessReviewReply,
  reconcileGoogleBusinessReviewReply,
  listGoogleBusinessReviews,
} from "@/lib/api/google-business";
import { getErrorMessage } from "@/lib/api/client";

const STAR_VALUES = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function ReviewStars({ value }) {
  const rating = STAR_VALUES[value] || 0;
  return <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={rating ? `${rating} out of 5 stars` : "No star rating"}>
    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-current" : ""}`} />)}
  </span>;
}

export default function GoogleReviewsPage() {
  const { activeBusiness } = useBusiness();
  const businessId = activeBusiness?._id || activeBusiness?.id;
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState({});
  const [draftErrors, setDraftErrors] = useState({});
  const [generatingReviewId, setGeneratingReviewId] = useState("");
  const [copiedReviewId, setCopiedReviewId] = useState("");
  const [savingReviewId, setSavingReviewId] = useState("");
  const [savedReviewIds, setSavedReviewIds] = useState({});
  const [publishedReviewIds, setPublishedReviewIds] = useState({});
  const [reconciliationReviewIds, setReconciliationReviewIds] = useState({});
  const [reconcilingReviewId, setReconcilingReviewId] = useState("");
  const [publishingReviewId, setPublishingReviewId] = useState("");
  const [showingMockReviews, setShowingMockReviews] = useState(false);
  const [pendingPublishReview, setPendingPublishReview] = useState(null);
  const isDevelopment = process.env.NODE_ENV !== "production";

  const loadReviews = useCallback(async ({ append = false } = {}) => {
    if (!businessId) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const result = await listGoogleBusinessReviews(businessId, append ? nextPageToken : undefined);
      setData(result);
      setReviews((current) => append ? [...current, ...(result.reviews || [])] : (result.reviews || []));
      setNextPageToken(result.nextPageToken || null);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load Google reviews."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [businessId, nextPageToken]);

  useEffect(() => {
    setData(null);
    setReviews([]);
    setNextPageToken(null);
    setDrafts({});
    setDraftErrors({});
    setSavedReviewIds({});
    setPublishedReviewIds({});
    setReconciliationReviewIds({});
    if (businessId) {
      loadReviews();
      listGoogleBusinessReviewReplyDrafts(businessId)
        .then((result) => {
          const savedDrafts = {};
          (result.drafts || []).forEach((draft) => {
            savedDrafts[draft.reviewId] = draft.reply;
          });
          setDrafts(savedDrafts);
          setPublishedReviewIds(
            Object.fromEntries((result.drafts || []).filter((draft) => draft.status === "published").map((draft) => [draft.reviewId, true]))
          );
          setReconciliationReviewIds(
            Object.fromEntries((result.drafts || []).filter((draft) => draft.status === "needs_reconciliation").map((draft) => [draft.reviewId, true]))
          );
          setSavedReviewIds(
            Object.fromEntries(Object.keys(savedDrafts).map((id) => [id, true]))
          );
        })
        .catch((err) => {
          setError(getErrorMessage(err, "Could not load saved reply drafts."));
        });
    }
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReply = async (review) => {
    const reviewId = review.name || review.reviewId;
    if (!businessId || !reviewId) return;
    setGeneratingReviewId(reviewId);
    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));
    try {
      const result = await generateGoogleBusinessReviewReplyDraft(businessId, reviewId, {
        reviewerName: review.reviewer?.displayName || "",
        rating: STAR_VALUES[review.starRating] || 0,
        comment: review.comment || "",
      });
      setDrafts((current) => ({ ...current, [reviewId]: result.reply || "" }));
      setSavedReviewIds((current) => ({ ...current, [reviewId]: true }));
    } catch (err) {
      setDraftErrors((current) => ({
        ...current,
        [reviewId]: getErrorMessage(err, "Couldn't generate a reply."),
      }));
    } finally {
      setGeneratingReviewId("");
    }
  };

  const saveDraft = async (reviewId) => {
    setSavingReviewId(reviewId);
    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));
    try {
      const result = await saveGoogleBusinessReviewReplyDraft(businessId, reviewId, drafts[reviewId]);
      setDrafts((current) => ({ ...current, [reviewId]: result.reply }));
      setSavedReviewIds((current) => ({ ...current, [reviewId]: true }));
    } catch (err) {
      setDraftErrors((current) => ({ ...current, [reviewId]: getErrorMessage(err, "Could not save this draft.") }));
    } finally {
      setSavingReviewId("");
    }
  };

  const reconcileReply = async (review) => {
    const reviewId = review.name || review.reviewId;
    if (!businessId || !reviewId || !reconciliationReviewIds[reviewId]) return;

    setReconcilingReviewId(reviewId);
    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));
    try {
      const result = await reconcileGoogleBusinessReviewReply(businessId, reviewId);
      if (result.status === "published") {
        setPublishedReviewIds((current) => ({ ...current, [reviewId]: true }));
        setReconciliationReviewIds((current) => ({ ...current, [reviewId]: false }));
        setReviews((current) => current.map((item) =>
          (item.name || item.reviewId) === reviewId
            ? { ...item, reviewReply: result.reviewReply || item.reviewReply }
            : item
        ));
      } else {
        setDraftErrors((current) => ({ ...current, [reviewId]: result.message || "Google has not confirmed publication yet. Check again later." }));
      }
    } catch (err) {
      setDraftErrors((current) => ({ ...current, [reviewId]: getErrorMessage(err, "Could not check publication status.") }));
    } finally {
      setReconcilingReviewId("");
    }
  };

  const publishReply = (review) => {
    const reviewId = review.name || review.reviewId;
    if (!businessId || !reviewId || review.isMock || !savedReviewIds[reviewId] || publishedReviewIds[reviewId]) return;
    setPendingPublishReview(review);
  };

  const confirmPublishReply = async () => {
    const review = pendingPublishReview;
    const reviewId = review?.name || review?.reviewId;
    if (!review || !businessId || !reviewId || !savedReviewIds[reviewId] || publishedReviewIds[reviewId]) return;

    setPendingPublishReview(null);
    setPublishingReviewId(reviewId);
    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));
    try {
      await publishGoogleBusinessReviewReply(businessId, reviewId);
      setPublishedReviewIds((current) => ({ ...current, [reviewId]: true }));
      setReviews((current) => current.map((item) =>
        (item.name || item.reviewId) === reviewId
          ? { ...item, reviewReply: { comment: drafts[reviewId], updateTime: new Date().toISOString() } }
          : item
      ));
    } catch (err) {
      setDraftErrors((current) => ({
        ...current,
        [reviewId]: getErrorMessage(err, "Could not publish this reply."),
      }));
    } finally {
      setPublishingReviewId("");
    }
  };

  const copyDraft = async (reviewId) => {
    try {
      await navigator.clipboard.writeText(drafts[reviewId] || "");
      setCopiedReviewId(reviewId);
      window.setTimeout(() => setCopiedReviewId(""), 1800);
    } catch {
      setDraftErrors((current) => ({ ...current, [reviewId]: "Could not copy the draft. Select and copy it manually." }));
    }
  };

  const loadMockReview = () => {
    const mockReview = {
      reviewId: "dev-mock-review-positive-001",
      reviewer: { displayName: "Alex Morgan" },
      starRating: "FIVE",
      comment: "Really happy with the service. The team was professional, arrived on time, and completed the work neatly. Thank you!",
      createTime: new Date().toISOString(),
      isMock: true,
    };
    setReviews([mockReview]);
    setNextPageToken(null);
    setShowingMockReviews(true);
    setError("");
  };

  const average = typeof data?.averageRating === "number" ? data.averageRating.toFixed(1) : "—";

  const replacingExistingReply = Boolean(pendingPublishReview?.reviewReply?.comment);

  return <>
    {pendingPublishReview && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !publishingReviewId) setPendingPublishReview(null);
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="publish-review-title" aria-describedby="publish-review-description" className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Globe2 className="h-5 w-5" /></div>
            <div><h2 id="publish-review-title" className="text-base font-semibold">Publish reply on Google?</h2><p className="mt-0.5 text-sm text-muted">This action will be visible publicly.</p></div>
          </div>
          <button type="button" aria-label="Close confirmation" onClick={() => setPendingPublishReview(null)} disabled={Boolean(publishingReviewId)} className="rounded-lg p-1.5 text-muted transition hover:bg-sunken hover:text-foreground disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          <p id="publish-review-description" className="text-sm leading-6 text-foreground">
            {replacingExistingReply
              ? "This review already has an owner reply. Publishing will replace that existing reply with your saved draft."
              : "Your saved reply will be published publicly as the business owner on Google."}
          </p>
          <div className="rounded-lg border border-line bg-sunken p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Saved reply preview</p>
            <p className="whitespace-pre-wrap text-sm leading-6">{drafts[pendingPublishReview.name || pendingPublishReview.reviewId]}</p>
          </div>
          <p className="text-xs text-muted">You can’t undo this from the app. Make sure the reply is ready before publishing.</p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setPendingPublishReview(null)} disabled={Boolean(publishingReviewId)}>Cancel</Button>
          <Button type="button" onClick={confirmPublishReply} disabled={Boolean(publishingReviewId)}><Globe2 className="h-4 w-4" /> Approve &amp; publish</Button>
        </div>
      </div>
    </div>}
    <PageHeader title="Google reviews" description={activeBusiness ? `Read reviews from the Google Business Profile linked to ${activeBusiness.name}.` : "Select a business to view its Google reviews."}
      actions={<>
        {isDevelopment && <Button variant="secondary" size="sm" onClick={loadMockReview} disabled={!businessId}>Load test review</Button>}
        <Button variant="secondary" size="sm" onClick={() => { setShowingMockReviews(false); loadReviews(); }} disabled={!businessId || loading}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </>} />
    {!businessId ? <Card><CardBody><p className="text-sm text-muted">Select a business from the business switcher to continue.</p></CardBody></Card> : <>
      {showingMockReviews && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Development test data only. This sample review is not from Google and will never be published to Google.</div>}
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {data && <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card><CardBody className="space-y-1"><p className="text-sm text-muted">Average Google rating</p><p className="text-2xl font-semibold">{average} / 5</p></CardBody></Card>
        <Card><CardBody className="space-y-1"><p className="text-sm text-muted">Total Google reviews</p><p className="text-2xl font-semibold">{data.totalReviewCount ?? 0}</p></CardBody></Card>
      </div>}
      {loading && reviews.length === 0 ? <Card><CardBody><p className="text-sm text-muted">Loading Google reviews…</p></CardBody></Card>
        : reviews.length === 0 && !error ? <Card><CardBody className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquareText className="h-8 w-8 text-muted" /><p className="font-medium">No Google reviews found</p>
          <p className="max-w-lg text-sm text-muted">The listing may not have received reviews yet, or Google may require the Business Profile to be verified before reviews can be retrieved.</p>
        </CardBody></Card>
        : <div className="space-y-3">{reviews.map((review) => {
          const reviewId = review.name || review.reviewId;
          const draft = drafts[reviewId] || "";
          return <Card key={reviewId}><CardBody className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {review.reviewer?.profilePhotoUrl ? <img src={review.reviewer.profilePhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-sm font-semibold">{review.reviewer?.displayName?.slice(0, 1) || "G"}</div>}
                <div><p className="font-medium">{review.reviewer?.displayName || "Google user"}</p><p className="text-xs text-muted">{review.createTime ? new Date(review.createTime).toLocaleDateString() : "Date unavailable"}</p></div>
              </div>
              <div className="flex items-center gap-2"><ReviewStars value={review.starRating} />{review.isMock && <Badge tone="warning">Test review</Badge>}</div>
            </div>
            {review.comment ? <p className="whitespace-pre-wrap text-sm leading-6">{review.comment}</p> : <p className="text-sm italic text-muted">Rating only — no written comment.</p>}
            {review.reviewReply?.comment && <div className="rounded-lg bg-sunken p-3">
              <div className="mb-1 flex items-center gap-2"><Badge tone="success">Owner reply</Badge><span className="text-xs text-muted">{review.reviewReply.updateTime ? new Date(review.reviewReply.updateTime).toLocaleDateString() : ""}</span></div>
              <p className="whitespace-pre-wrap text-sm">{review.reviewReply.comment}</p>
            </div>}
            {review.reviewReplyUrl && <a href={review.reviewReplyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Open review on Google <ExternalLink className="h-3 w-3" /></a>}

            <div className="border-t border-line pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-sm font-medium">AI reply assistant</p><p className="text-xs text-muted">Generate a draft, edit and save it, then approve before publishing to Google.</p></div>
                <Button size="sm" variant="secondary" onClick={() => generateReply(review)} loading={generatingReviewId === reviewId} disabled={Boolean(generatingReviewId)}>
                  <Sparkles className="h-4 w-4" /> {draft ? "Regenerate draft" : "Generate reply"}
                </Button>
              </div>
              {draftErrors[reviewId] && <p role="alert" className="mb-2 text-sm text-red-600">{draftErrors[reviewId]}</p>}
              {draft && <>
                <textarea
                  value={draft}
                  onChange={(event) => {
                    setDrafts((current) => ({ ...current, [reviewId]: event.target.value }));
                    setSavedReviewIds((current) => ({ ...current, [reviewId]: false }));
                  }}
                  rows={4}
                  maxLength={1500}
                  aria-label="Editable AI review reply draft"
                  className="w-full rounded-lg border border-line-strong bg-surface p-3 text-sm leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">{publishedReviewIds[reviewId] ? "Published to Google" : reconciliationReviewIds[reviewId] ? "Publication status uncertain · Check Google status" : `Draft only · ${savedReviewIds[reviewId] ? "Saved" : "Unsaved"}`} · {draft.length}/1500</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => saveDraft(reviewId)} loading={savingReviewId === reviewId} disabled={!draft.trim() || Boolean(savingReviewId) || Boolean(publishedReviewIds[reviewId])}>Save draft</Button>
                    {!review.isMock && reconciliationReviewIds[reviewId] && <Button size="sm" variant="secondary" onClick={() => reconcileReply(review)} loading={reconcilingReviewId === reviewId} disabled={Boolean(reconcilingReviewId)}>Check Google status</Button>}
                    {!review.isMock && !reconciliationReviewIds[reviewId] && <Button size="sm" onClick={() => publishReply(review)} loading={publishingReviewId === reviewId} disabled={!savedReviewIds[reviewId] || Boolean(publishedReviewIds[reviewId]) || Boolean(publishingReviewId)}>{publishedReviewIds[reviewId] ? "Published" : "Approve & publish"}</Button>}
                    <Button size="sm" onClick={() => copyDraft(reviewId)}><Copy className="h-4 w-4" /> {copiedReviewId === reviewId ? <><Check className="h-4 w-4" /> Copied</> : "Copy draft"}</Button>
                  </div>
                </div>
              </>}
            </div>
          </CardBody></Card>;
        })}</div>}
      {nextPageToken && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => loadReviews({ append: true })} loading={loadingMore} disabled={loadingMore}>Load more reviews</Button></div>}
    </>}
  </>;
}
