"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquareText, RefreshCw, Star, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { listAdminReviews, moderateReview } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/api/client";

const FILTERS = ["pending", "approved", "rejected", "all"];

function Stars({ rating }) {
  return (
    <span className="inline-flex text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className={`h-4 w-4 ${value <= rating ? "fill-current" : ""}`} />
      ))}
    </span>
  );
}

export default function ReviewsAdminPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminReviews({ status: filter, limit: 50 });
      setReviews(result.reviews || []);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load customer feedback."));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) loadReviews();
  }, [user, loadReviews]);

  async function handleModeration(reviewId, status) {
    setBusyId(reviewId);
    setError("");
    setNotice("");
    try {
      await moderateReview(reviewId, { status });
      setNotice(status === "approved" ? "Feedback approved and published as a testimonial." : "Feedback rejected.");
      await loadReviews();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't update this review."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Review moderation"
        description="Manage feedback submitted through QR forms for businesses you own. Platform admins can review feedback across all businesses."
        actions={<Button variant="secondary" size="sm" onClick={loadReviews}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Review status">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${filter === value ? "border-brand-700 bg-brand-50 font-semibold text-brand-800" : "border-line bg-surface text-muted hover:bg-sunken"}`}
          >
            {value}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <Card><CardBody><p className="text-sm text-muted">Loading feedback…</p></CardBody></Card>
      ) : reviews.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No feedback found" description={`There are no ${filter === "all" ? "" : filter + " "}submissions in this view.`} />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review._id}>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{review.customerName}</p>
                    <p className="text-xs text-muted">{review.businessId?.name || "Business"} · {new Date(review.createdAt).toLocaleString()}</p>
                    {review.customerEmail && <p className="mt-1 text-xs text-muted">Private email: {review.customerEmail}</p>}
                  </div>
                  <Badge tone={review.status === "approved" ? "success" : review.status === "rejected" ? "danger" : "warning"}>{review.status}</Badge>
                </div>

                <div className="flex items-center gap-2"><Stars rating={review.rating} /><span className="text-xs text-muted">{review.rating}/5</span></div>
                <p className="whitespace-pre-wrap text-sm leading-6">{review.comment}</p>
                <p className="text-xs text-muted">
                  Public display consent: {review.publicDisplayConsent ? "Given" : "Not given"}
                </p>

                {review.status === "pending" && (
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    <Button size="sm" loading={busyId === review._id} disabled={!review.publicDisplayConsent || Boolean(busyId)} onClick={() => handleModeration(review._id, "approved")}>
                      <Check className="h-4 w-4" /> Approve & publish
                    </Button>
                    <Button size="sm" variant="danger-outline" loading={busyId === review._id} disabled={Boolean(busyId)} onClick={() => handleModeration(review._id, "rejected")}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    {!review.publicDisplayConsent && <p className="w-full text-xs text-muted">This customer did not consent to public display. You can reject or keep the feedback private, but cannot publish it as a testimonial.</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
