"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, RefreshCw, Star, ExternalLink, Sparkles, Copy, Check } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import {
  generateGoogleBusinessReviewReplyDraft,
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
  const [copiedReviewId, setCopiedReviewId] = useState("");\n  const [savingReviewId, setSavingReviewId] = useState("");\n  const [savedReviewIds, setSavedReviewIds] = useState({});

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
    if (businessId) loadReviews();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReply = async (review) => {
    const reviewId = review.reviewId || review.name;
    if (!businessId || !reviewId) return;
    setGeneratingReviewId(reviewId);
    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));
    try {
      const result = await generateGoogleBusinessReviewReplyDraft(businessId, reviewId, {
        reviewerName: review.reviewer?.displayName || "",
        rating: STAR_VALUES[review.starRating] || 0,
        comment: review.comment || "",
      });
      setDrafts((current) => ({ ...current, [reviewId]: result.reply || "" }));\n      setSavedReviewIds((current) => ({ ...current, [reviewId]: true }));
    } catch (err) {
      setDraftErrors((current) => ({
        ...current,
        [reviewId]: getErrorMessage(err, "Couldn't generate a reply."),
      }));
    } finally {
      setGeneratingReviewId("");
    }
  };

  const saveDraft = async (reviewId) => {\n    setSavingReviewId(reviewId);\n    setDraftErrors((current) => ({ ...current, [reviewId]: "" }));\n    try {\n      const result = await saveGoogleBusinessReviewReplyDraft(businessId, reviewId, drafts[reviewId]);\n      setDrafts((current) => ({ ...current, [reviewId]: result.reply }));\n      setSavedReviewIds((current) => ({ ...current, [reviewId]: true }));\n    } catch (err) {\n      setDraftErrors((current) => ({ ...current, [reviewId]: getErrorMessage(err, "Could not save this draft.") }));\n    } finally {\n      setSavingReviewId("");\n    }\n  };\n\n  const copyDraft = async (reviewId) => {
    try {
      await navigator.clipboard.writeText(drafts[reviewId] || "");
      setCopiedReviewId(reviewId);
      window.setTimeout(() => setCopiedReviewId(""), 1800);
    } catch {
      setDraftErrors((current) => ({ ...current, [reviewId]: "Could not copy the draft. Select and copy it manually." }));
    }
  };

  const average = typeof data?.averageRating === "number" ? data.averageRating.toFixed(1) : "—";

  return <>
    <PageHeader title="Google reviews" description={activeBusiness ? `Read reviews from the Google Business Profile linked to ${activeBusiness.name}.` : "Select a business to view its Google reviews."}
      actions={<Button variant="secondary" size="sm" onClick={() => loadReviews()} disabled={!businessId || loading}><RefreshCw className="h-4 w-4" /> Refresh</Button>} />
    {!businessId ? <Card><CardBody><p className="text-sm text-muted">Select a business from the business switcher to continue.</p></CardBody></Card> : <>
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
          const reviewId = review.reviewId || review.name;
          const draft = drafts[reviewId] || "";
          return <Card key={reviewId}><CardBody className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {review.reviewer?.profilePhotoUrl ? <img src={review.reviewer.profilePhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-sm font-semibold">{review.reviewer?.displayName?.slice(0, 1) || "G"}</div>}
                <div><p className="font-medium">{review.reviewer?.displayName || "Google user"}</p><p className="text-xs text-muted">{review.createTime ? new Date(review.createTime).toLocaleDateString() : "Date unavailable"}</p></div>
              </div>
              <ReviewStars value={review.starRating} />
            </div>
            {review.comment ? <p className="whitespace-pre-wrap text-sm leading-6">{review.comment}</p> : <p className="text-sm italic text-muted">Rating only — no written comment.</p>}
            {review.reviewReply?.comment && <div className="rounded-lg bg-sunken p-3">
              <div className="mb-1 flex items-center gap-2"><Badge tone="success">Owner reply</Badge><span className="text-xs text-muted">{review.reviewReply.updateTime ? new Date(review.reviewReply.updateTime).toLocaleDateString() : ""}</span></div>
              <p className="whitespace-pre-wrap text-sm">{review.reviewReply.comment}</p>
            </div>}
            {review.reviewReplyUrl && <a href={review.reviewReplyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Open review on Google <ExternalLink className="h-3 w-3" /></a>}

            <div className="border-t border-line pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-sm font-medium">AI reply assistant</p><p className="text-xs text-muted">Generate a draft, edit it, then copy it for manual posting.</p></div>
                <Button size="sm" variant="secondary" onClick={() => generateReply(review)} loading={generatingReviewId === reviewId} disabled={Boolean(generatingReviewId)}>
                  <Sparkles className="h-4 w-4" /> {draft ? "Regenerate draft" : "Generate reply"}
                </Button>
              </div>
              {draftErrors[reviewId] && <p role="alert" className="mb-2 text-sm text-red-600">{draftErrors[reviewId]}</p>}
              {draft && <>
                <textarea
                  value={draft}
                  onChange={(event) => {\n                    setDrafts((current) => ({ ...current, [reviewId]: event.target.value }));\n                    setSavedReviewIds((current) => ({ ...current, [reviewId]: false }));\n                  }}
                  rows={4}
                  maxLength={1500}
                  aria-label="Editable AI review reply draft"
                  className="w-full rounded-lg border border-line-strong bg-surface p-3 text-sm leading-6 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">Draft only · Not published to Google · {draft.length}/1500</span>
                  <Button size="sm" onClick={() => copyDraft(reviewId)}><Copy className="h-4 w-4" /> {copiedReviewId === reviewId ? <><Check className="h-4 w-4" /> Copied</> : "Copy draft"}</Button>
                </div>
              </>}
            </div>
          </CardBody></Card>;
        })}</div>}
      {nextPageToken && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => loadReviews({ append: true })} loading={loadingMore} disabled={loadingMore}>Load more reviews</Button></div>}
    </>}
  </>;
}
