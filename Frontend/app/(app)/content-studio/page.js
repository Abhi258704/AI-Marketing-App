"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, FilePlus2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { useBusiness } from "@/components/providers/business-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PlatformBadges } from "@/components/posts/post-badges";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { generateContent } from "@/lib/api/ai";
import { createPost } from "@/lib/api/posts";
import { getErrorMessage } from "@/lib/api/client";
import {
  INSTAGRAM_CAPTION_LIMIT,
  INSTAGRAM_HASHTAG_LIMIT,
  PLATFORMS,
  platformLabel,
} from "@/lib/post-rules";

const GOALS = [
  "Increase engagement",
  "Drive foot traffic",
  "Promote an offer",
  "Announce a new product or service",
  "Build brand awareness",
  "Generate leads",
  "Get bookings",
];
const TONES = ["Engaging", "Friendly", "Professional", "Playful", "Inspirational", "Luxurious", "Informative", "Urgent"];

const parseHashtags = (text) =>
  [...new Set(
    text
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
  )];

function normalizeResult(content) {
  if (!content || typeof content.caption !== "string" || !content.caption.trim()) return null;
  return {
    caption: content.caption.trim(),
    callToAction: typeof content.callToAction === "string" ? content.callToAction.trim() : "",
    hashtags: Array.isArray(content.hashtags) ? content.hashtags.filter((h) => typeof h === "string") : [],
  };
}

function CopyButton({ text, label, disabled }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error("Couldn't copy", { message: "Your browser blocked clipboard access. Select the text and copy it manually." });
    }
  }
  return (
    <Button variant="secondary" size="sm" onClick={copy} disabled={disabled || !text}>
      {done ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {done ? "Copied" : label}
    </Button>
  );
}

function StudioContent({ business }) {
  const toast = useToast();
  const { businesses, selectBusiness } = useBusiness();

  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [topicError, setTopicError] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [original, setOriginal] = useState(null);
  const [caption, setCaption] = useState("");
  const [cta, setCta] = useState("");
  const [hashtagText, setHashtagText] = useState("");
  const [includeCta, setIncludeCta] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  // The request that produced the current result (so the preview label can't drift from it).
  const [producedFor, setProducedFor] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedPost, setSavedPost] = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const requestId = useRef(0);

  const hashtags = useMemo(() => parseHashtags(hashtagText), [hashtagText]);
  const finalText = useMemo(
    () =>
      [caption.trim(), includeCta ? cta.trim() : "", includeHashtags ? hashtags.join(" ") : ""]
        .filter(Boolean)
        .join("\n\n"),
    [caption, cta, hashtags, includeCta, includeHashtags]
  );

  const dirty =
    original !== null &&
    (caption !== original.caption || cta !== original.callToAction || hashtagText !== original.hashtags.join(" "));

  async function generate() {
    if (!topic.trim()) {
      setTopicError("Describe the topic or campaign idea.");
      return;
    }
    setTopicError(null);
    setGenError(null);
    setSavedPost(null);
    setGenerating(true);
    const id = ++requestId.current;
    try {
      const res = await generateContent({
        businessId: business._id,
        platform: platformLabel(platform), // backend prompt uses "Instagram" / "Facebook"
        topic: topic.trim(),
        goal,
        tone,
      });
      if (id !== requestId.current) return;
      const normalized = normalizeResult(res.content);
      if (!normalized) throw new Error("The AI response was incomplete. Please try generating again.");
      setOriginal(normalized);
      setCaption(normalized.caption);
      setCta(normalized.callToAction);
      setHashtagText(normalized.hashtags.join(" "));
      setProducedFor({ platform, businessName: business.name });
    } catch (e) {
      if (id === requestId.current) setGenError(getErrorMessage(e, "Couldn't generate content."));
    } finally {
      if (id === requestId.current) setGenerating(false);
    }
  }

  function regenerate() {
    if (dirty) setConfirmRegen(true);
    else generate();
  }

  async function saveDraft() {
    if (!finalText) return;
    setSaving(true);
    try {
      const { post } = await createPost({
        businessId: business._id,
        title: topic.trim().slice(0, 100) || null,
        content: finalText,
        mediaUrls: [],
        platforms: [producedFor?.platform || platform],
      });
      setSavedPost(post);
      toast.success("Saved as a draft", { message: "Add an image and schedule it from the post page." });
    } catch (e) {
      toast.error("Couldn't save the draft", { message: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  const targetPlatform = producedFor?.platform || platform;
  const overLimit = targetPlatform === "instagram" && (finalText.length > INSTAGRAM_CAPTION_LIMIT || hashtags.length > INSTAGRAM_HASHTAG_LIMIT);

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Content Studio"
        description="Describe what you want to promote and get a ready-to-edit caption, call to action and hashtags."
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form
          onSubmit={(e) => { e.preventDefault(); generate(); }}
          noValidate
          className="space-y-5 lg:sticky lg:top-24 lg:self-start"
        >
          <Card>
            <CardBody className="space-y-5">
              <Select label="Business" value={business._id} onChange={(e) => selectBusiness(e.target.value)}>
                {businesses.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </Select>

              <Field label="Platform">
                {() => (
                  <div role="radiogroup" aria-label="Platform" className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={platform === p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`h-10 rounded-lg border text-sm font-medium transition-colors ${platform === p.id ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line-strong bg-surface hover:bg-sunken"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <Textarea
                label="Topic or campaign idea"
                required
                rows={4}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                error={topicError}
                placeholder="e.g. Weekend brunch special with live music"
                maxLength={500}
              />

              <div>
                <Input label="Marketing goal" list="goal-options" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={120} />
                <datalist id="goal-options">{GOALS.map((g) => <option key={g} value={g} />)}</datalist>
              </div>

              <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </Select>

              <Button type="submit" className="w-full" loading={generating}>
                <Sparkles className="h-4 w-4" aria-hidden /> {original ? "Generate new version" : "Generate content"}
              </Button>
            </CardBody>
          </Card>
        </form>

        <div className="space-y-4">
          {genError && <Alert tone="danger" title="Generation failed">{genError}</Alert>}

          {generating && (
            <Card>
              <CardBody className="space-y-3" role="status">
                <span className="sr-only">Generating content</span>
                <p className="flex items-center gap-2 text-sm text-muted"><Wand2 className="h-4 w-4 animate-pulse" aria-hidden /> Writing your {platformLabel(platform)} post… this usually takes a few seconds.</p>
                <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-3/4" />
              </CardBody>
            </Card>
          )}

          {!generating && !original && !genError && (
            <Card className="border-dashed">
              <CardBody className="py-14 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Sparkles className="h-5 w-5" aria-hidden /></span>
                <h2 className="text-base font-semibold">Your generated content will appear here</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Fill in the topic, pick a platform and tone, then generate. You can edit everything before saving.</p>
              </CardBody>
            </Card>
          )}

          {original && (
            <>
              <Card className={generating ? "opacity-60" : ""}>
                <CardHeader
                  title="Edit your content"
                  description={`Written for ${platformLabel(producedFor?.platform || platform)} · ${producedFor?.businessName || business.name}. AI-generated: review before publishing.`}
                  action={<Button variant="secondary" size="sm" onClick={regenerate} disabled={generating}><RefreshCw className="h-4 w-4" aria-hidden /> Regenerate</Button>}
                />
                <CardBody className="space-y-5">
                  <Textarea label="Caption" rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} />
                  <Input label="Call to action" value={cta} onChange={(e) => setCta(e.target.value)} />
                  <Textarea
                    label="Hashtags"
                    rows={2}
                    value={hashtagText}
                    onChange={(e) => setHashtagText(e.target.value)}
                    hint={`${hashtags.length} hashtag${hashtags.length === 1 ? "" : "s"} · separate with spaces`}
                  />
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Checkbox label="Include call to action" checked={includeCta} onChange={(e) => setIncludeCta(e.target.checked)} />
                    <Checkbox label="Include hashtags" checked={includeHashtags} onChange={(e) => setIncludeHashtags(e.target.checked)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={caption.trim()} label="Copy caption" />
                    <CopyButton text={hashtags.join(" ")} label="Copy hashtags" disabled={hashtags.length === 0} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Ready-to-post preview" description="Caption, call to action and hashtags combined, exactly as it will be saved." action={<PlatformBadges platforms={[targetPlatform]} />} />
                <CardBody className="space-y-4">
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-canvas p-4 text-sm leading-relaxed">{finalText || "Nothing to preview yet."}</p>
                  <p className={`text-xs ${overLimit ? "font-medium text-red-700" : "text-muted"}`}>
                    {finalText.length} characters
                    {targetPlatform === "instagram" && ` · limit ${INSTAGRAM_CAPTION_LIMIT} characters and ${INSTAGRAM_HASHTAG_LIMIT} hashtags`}
                  </p>
                  {targetPlatform === "instagram" && (
                    <Alert tone="info">Instagram posts need an image URL. Add one on the post page after saving the draft.</Alert>
                  )}

                  {savedPost ? (
                    <Alert tone="success" title="Draft saved">
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ButtonLink size="sm" href={`/posts/${savedPost._id}`}>Open draft to add media &amp; schedule</ButtonLink>
                        <Button size="sm" variant="secondary" onClick={() => setSavedPost(null)}>Save another copy</Button>
                      </div>
                    </Alert>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <CopyButton text={finalText} label="Copy full post" />
                      <Button onClick={saveDraft} loading={saving} disabled={!finalText || overLimit}>
                        <FilePlus2 className="h-4 w-4" aria-hidden /> Save as draft post
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={() => { setConfirmRegen(false); generate(); }}
        title="Replace your edits?"
        confirmLabel="Regenerate"
      >
        <p>You&apos;ve edited this content. Regenerating will replace it with a new AI version.</p>
        <p>Tip: copy anything you want to keep first.</p>
      </ConfirmDialog>
    </>
  );
}

export default function ContentStudioPage() {
  return (
    <RequireBusiness description="Content is generated using your business profile. Create a business first.">
      {(business) => <StudioContent key={business._id} business={business} />}
    </RequireBusiness>
  );
}
