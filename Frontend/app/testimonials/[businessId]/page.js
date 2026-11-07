"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { listTestimonials } from "@/lib/api/reviews";

export default function TestimonialsPage() {
  const params = useParams();
  const businessId = params?.businessId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    listTestimonials(businessId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load testimonials.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          AI Marketing Platform
        </Link>
        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Customer testimonials</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data?.business?.name || "Customer feedback"}
          </h1>
          {data?.averageRating !== null && data?.averageRating !== undefined && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted">
              <span className="font-semibold text-ink">{data.averageRating.toFixed(1)}</span>
              <span className="flex text-amber-500" aria-label={`${data.averageRating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${star <= Math.round(data.averageRating) ? "fill-current" : ""}`} />
                ))}
              </span>
              <span>{data.pagination?.total || 0} testimonials</span>
            </div>
          )}
        </header>

        {loading && <p className="mt-8 text-sm text-muted">Loading testimonials…</p>}
        {error && <p role="alert" className="mt-8 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && !error && data?.testimonials?.length === 0 && (
          <p className="mt-8 rounded-xl border border-line bg-surface p-6 text-sm text-muted">
            No public testimonials yet.
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(data?.testimonials || []).map((review) => (
            <article key={review._id} className="rounded-xl border border-line bg-surface p-5">
              <div className="flex gap-1 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-current" : ""}`} />
                ))}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{review.comment}</p>
              <p className="mt-4 text-sm font-semibold">{review.customerName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {review.publishedAt ? new Date(review.publishedAt).toLocaleDateString() : ""}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
