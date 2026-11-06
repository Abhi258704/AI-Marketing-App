"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { submitFeedback } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  const params = useParams();
  const businessId = params?.businessId;
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [publicDisplayConsent, setPublicDisplayConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!businessId) {
      setError("This feedback link is invalid.");
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        businessId,
        customerName,
        customerEmail: customerEmail || undefined,
        rating,
        comment,
        publicDisplayConsent,
      });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't submit your feedback. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          AI Marketing Platform
        </Link>

        <section className="mt-5 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-brand-700" aria-hidden />
              <h1 className="mt-4 text-2xl font-semibold">Thank you for your feedback</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Your feedback has been sent to the business for review. If approved and you gave permission,
                it may appear publicly as a testimonial on this platform.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Customer feedback
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Share your experience</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tell the business how your experience went. Your feedback is reviewed before it can appear
                as a public testimonial on this platform.
              </p>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <fieldset>
                  <legend className="text-sm font-medium">Your rating</legend>
                  <div className="mt-2 flex items-center gap-2" role="group" aria-label="Choose a rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                        aria-pressed={rating === value}
                        className="rounded-md p-1 text-amber-500 transition hover:scale-105"
                      >
                        <Star className={`h-8 w-8 ${value <= rating ? "fill-current" : "fill-transparent text-line-strong"}`} />
                      </button>
                    ))}
                    <span className="ml-1 text-sm text-muted">{rating}/5</span>
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="customerName" className="mb-1.5 block text-sm font-medium">
                    Your name
                  </label>
                  <input
                    id="customerName"
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label htmlFor="customerEmail" className="mb-1.5 block text-sm font-medium">
                    Email <span className="font-normal text-muted">(optional, not shown publicly)</span>
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="comment" className="mb-1.5 block text-sm font-medium">
                    Your feedback
                  </label>
                  <textarea
                    id="comment"
                    required
                    minLength={2}
                    maxLength={2000}
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
                    placeholder="What went well? What could be improved?"
                  />
                  <p className="mt-1 text-right text-xs text-muted">{comment.length}/2000</p>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={publicDisplayConsent}
                    onChange={(event) => setPublicDisplayConsent(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand-700"
                  />
                  <span>
                    I agree that my name, rating and feedback may be displayed publicly as a testimonial
                    on this platform if the business approves it. My email address will not be displayed.
                  </span>
                </label>

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={submitting} className="w-full">
                  Submit feedback
                </Button>
              </form>
            </>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-muted">
          This form collects private feedback for the business. It does not create or submit a Google review.
        </p>
      </div>
    </main>
  );
}
