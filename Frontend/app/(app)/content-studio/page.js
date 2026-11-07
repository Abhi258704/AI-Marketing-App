"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FilePlus2, ImagePlus, RefreshCw, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { RequireBusiness } from "@/components/layout/require-business";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PlatformBadges } from "@/components/posts/post-badges";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  generateContent,
  generateMarketingImage,
  saveMarketingPoster,
  deleteGeneratedImage,
} from "@/lib/api/ai";
import { API_BASE_URL } from "@/lib/config";
import { createPost } from "@/lib/api/posts";
import { clearContentStudioDraft, getContentStudioDraft, saveContentStudioDraft } from "@/lib/local-store";
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

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\\/\\//i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't load the generated image for poster design."));
    image.src = src;
  });
}

function wrapCanvasText(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").trim().split(/\\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  const usedWords = lines.join(" ").split(/\\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    let last = lines.length - 1;
    let shortened = lines[last];
    while (shortened && ctx.measureText(`${shortened}…`).width > maxWidth) {
      shortened = shortened.slice(0, -1).trimEnd();
    }
    lines[last] = `${shortened}…`;
  }
  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = wrapCanvasText(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length;
}

async function composeMarketingPoster({
  backgroundUrl,
  business,
  headline,
  supportingText,
  ctaText,
}) {
  const image = await loadCanvasImage(backgroundUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't prepare the poster canvas.");

  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

  const overlay = ctx.createLinearGradient(0, 0, 0, 1080);
  overlay.addColorStop(0, "rgba(8, 23, 29, 0.48)");
  overlay.addColorStop(0.38, "rgba(8, 23, 29, 0.10)");
  overlay.addColorStop(0.62, "rgba(8, 23, 29, 0.60)");
  overlay.addColorStop(1, "rgba(8, 23, 29, 0.94)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, 1080, 1080);

  // A compact brand lockup at the top; use the saved logo where available.
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.beginPath();
  ctx.roundRect(72, 66, 94, 94, 22);
  ctx.fill();

  let logoDrawn = false;
  if (business.logoUrl) {
    const logoSrc = /^https?:\\/\\//i.test(business.logoUrl)
      ? business.logoUrl
      : `${API_BASE_URL}${business.logoUrl.startsWith("/") ? "" : "/"}${business.logoUrl}`;
    try {
      const logo = await loadCanvasImage(logoSrc);
      const logoScale = Math.min(74 / logo.width, 74 / logo.height);
      const logoWidth = logo.width * logoScale;
      const logoHeight = logo.height * logoScale;
      ctx.drawImage(logo, 82 + (74 - logoWidth) / 2, 76 + (74 - logoHeight) / 2, logoWidth, logoHeight);
      logoDrawn = true;
    } catch {
      // A logo with restrictive CORS or a stale URL should not block poster creation.
    }
  }
  if (!logoDrawn) {
    ctx.fillStyle = "#0e8a72";
    ctx.font = "700 48px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(business.name || "B").trim().charAt(0).toUpperCase(), 119, 113);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Arial, sans-serif";
  drawWrappedText(ctx, business.name || "Your business", 190, 108, 800, 40, 2);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "500 21px Arial, sans-serif";
  ctx.fillText(String(business.category || "LOCAL BUSINESS").toUpperCase().slice(0, 52), 190, 148);

  // Small accent marker separates brand identity from the campaign message.
  ctx.fillStyle = "#36d6b0";
  ctx.fillRect(76, 510, 68, 7);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText("MADE FOR YOUR NEXT BIG MOVE", 76, 478);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 68px Arial, sans-serif";
  const titleLines = drawWrappedText(ctx, headline || business.name, 76, 600, 920, 78, 3);

  const descriptionY = 600 + titleLines * 78 + 26;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "400 28px Arial, sans-serif";
  drawWrappedText(ctx, supportingText || business.description || "Quality service. Trusted local expertise.", 78, descriptionY, 900, 38, 2);

  const buttonY = 914;
  const buttonLabel = String(ctaText || "CONTACT US TODAY").trim().toUpperCase().slice(0, 30);
  ctx.fillStyle = "#0e8a72";
  ctx.beginPath();
  ctx.roundRect(76, buttonY, Math.max(300, Math.min(560, ctx.measureText(buttonLabel).width + 100)), 76, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 25px Arial, sans-serif";
  ctx.fillText(buttonLabel, 112, buttonY + 48);

  const contact = [business.address, business.phone].filter(Boolean).join("  •  ");
  if (contact) {
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.font = "500 21px Arial, sans-serif";
    ctx.fillText(contact.slice(0, 90), 78, 1042);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
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
  const { user } = useAuth();
  const userId = user?.id;
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

  const [visualPrompt, setVisualPrompt] = useState("");
  const [posterHeadline, setPosterHeadline] = useState("");
  const [posterSupportingText, setPosterSupportingText] = useState("");
  const [posterCtaText, setPosterCtaText] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [imageRemaining, setImageRemaining] = useState(null);
  // The request that produced the current result (so the preview label can't drift from it).
  const [producedFor, setProducedFor] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedPost, setSavedPost] = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [hydratedScope, setHydratedScope] = useState(null);
  const requestId = useRef(0);
  const imageRequestId = useRef(0);

  // Restore the last working copy for this signed-in user and selected business.
  // The scope guard prevents default state from overwriting storage before restoration.
  const draftScope = userId && business._id ? `${userId}:${business._id}` : null;

  useEffect(() => {
    if (!draftScope) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;

      const draft = getContentStudioDraft(userId, business._id);
      if (draft && typeof draft === "object") {
        const storedOriginal =
          draft.original && typeof draft.original.caption === "string"
            ? {
                caption: draft.original.caption,
                callToAction: typeof draft.original.callToAction === "string" ? draft.original.callToAction : "",
                hashtags: Array.isArray(draft.original.hashtags)
                  ? draft.original.hashtags.filter((item) => typeof item === "string")
                  : [],
              }
            : null;
        const storedProducedFor =
          draft.producedFor && PLATFORMS.some((item) => item.id === draft.producedFor.platform)
            ? {
                platform: draft.producedFor.platform,
                businessName: typeof draft.producedFor.businessName === "string"
                  ? draft.producedFor.businessName
                  : business.name,
              }
            : null;

        setPlatform(PLATFORMS.some((item) => item.id === draft.platform) ? draft.platform : "instagram");
        setTopic(typeof draft.topic === "string" ? draft.topic : "");
        setGoal(typeof draft.goal === "string" ? draft.goal : GOALS[0]);
        setTone(typeof draft.tone === "string" ? draft.tone : TONES[0]);
        setOriginal(storedOriginal);
        setCaption(typeof draft.caption === "string" ? draft.caption : storedOriginal?.caption || "");
        setCta(typeof draft.cta === "string" ? draft.cta : storedOriginal?.callToAction || "");
        setHashtagText(
          typeof draft.hashtagText === "string" ? draft.hashtagText : storedOriginal?.hashtags.join(" ") || ""
        );
        setIncludeCta(typeof draft.includeCta === "boolean" ? draft.includeCta : true);
        setIncludeHashtags(typeof draft.includeHashtags === "boolean" ? draft.includeHashtags : true);
        setVisualPrompt(typeof draft.visualPrompt === "string" ? draft.visualPrompt : "");
        setPosterHeadline(typeof draft.posterHeadline === "string" ? draft.posterHeadline : "");
        setPosterSupportingText(typeof draft.posterSupportingText === "string" ? draft.posterSupportingText : "");
        setPosterCtaText(typeof draft.posterCtaText === "string" ? draft.posterCtaText : "");
        const expectedImagePrefix = `/temp/${userId}/${business._id}/`;
        setGeneratedImageUrl(
          typeof draft.generatedImageUrl === "string" && draft.generatedImageUrl.startsWith(expectedImagePrefix)
            ? draft.generatedImageUrl
            : ""
        );
        setProducedFor(storedProducedFor);
        setSavedPost(draft.savedPost && typeof draft.savedPost._id === "string" ? draft.savedPost : null);
        setRestoredDraft(Boolean(storedOriginal || draft.caption || draft.topic || draft.savedPost));
      }

      setHydratedScope(draftScope);
    });

    return () => {
      cancelled = true;
    };
  }, [draftScope, userId, business._id, business.name]);

  // Keep the working copy current as the user edits, without creating a backend Post.
  useEffect(() => {
    if (!draftScope || hydratedScope !== draftScope) return;

    saveContentStudioDraft(userId, business._id, {
      platform,
      topic,
      goal,
      tone,
      original,
      caption,
      cta,
      hashtagText,
      includeCta,
      includeHashtags,
      visualPrompt,
      posterHeadline,
      posterSupportingText,
      posterCtaText,
      generatedImageUrl,
      producedFor,
      savedPost,
    });
  }, [
    draftScope,
    hydratedScope,
    userId,
    business._id,
    platform,
    topic,
    goal,
    tone,
    original,
    caption,
    cta,
    hashtagText,
    includeCta,
    includeHashtags,
    visualPrompt,
    posterHeadline,
    posterSupportingText,
    posterCtaText,
    generatedImageUrl,
    producedFor,
    savedPost,
  ]);

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

  function resetFields({ keepStagedImage = false } = {}) {
    // A staged image belongs to a saved Post once saved; only delete unsaved media on manual reset.
    const imageToDelete =
      !keepStagedImage && generatedImageUrl && !savedPost ? generatedImageUrl : null;

    requestId.current += 1;
    imageRequestId.current += 1;
    setPlatform("instagram");
    setTopic("");
    setGoal(GOALS[0]);
    setTone(TONES[0]);
    setTopicError(null);
    setGenerating(false);
    setGenError(null);
    setOriginal(null);
    setCaption("");
    setCta("");
    setHashtagText("");
    setIncludeCta(true);
    setIncludeHashtags(true);
    setVisualPrompt("");
    setPosterHeadline("");
    setPosterSupportingText("");
    setPosterCtaText("");
    setGeneratedImageUrl("");
    setImageGenerating(false);
    setImageError(null);
    setProducedFor(null);
    setSavedPost(null);
    setConfirmRegen(false);
    setRestoredDraft(false);
    clearContentStudioDraft(userId, business._id);

    if (imageToDelete) {
      deleteGeneratedImage({ businessId: business._id, mediaUrl: imageToDelete }).catch(() => {});
    }
  }

  async function generate() {
    if (!topic.trim()) {
      setTopicError("Describe the topic or campaign idea.");
      return;
    }
    setTopicError(null);
    setGenError(null);
    // A saved draft already owns its staged image; don't attach that same file to a second draft.
    if (savedPost && generatedImageUrl) setGeneratedImageUrl("");
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

  async function generateImageAsset() {
    if (!topic.trim()) {
      setImageError("Describe the campaign topic before generating a poster.");
      return;
    }

    setImageError(null);
    setImageGenerating(true);
    const imageId = ++imageRequestId.current;
    const previousImageUrl = generatedImageUrl;
    const previousImageBelongsToSavedPost = Boolean(savedPost);
    let backgroundMediaUrl = "";

    try {
      const result = await generateMarketingImage({
        businessId: business._id,
        platform: platformLabel(platform),
        topic: topic.trim(),
        caption: finalText || caption,
        visualPrompt: visualPrompt.trim(),
      });

      if (!result.mediaUrl || !result.mediaUrl.startsWith(`/temp/${userId}/${business._id}/`)) {
        throw new Error("The server returned an invalid image reference. Please try again.");
      }
      backgroundMediaUrl = result.mediaUrl;

      if (imageId !== imageRequestId.current) {
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: backgroundMediaUrl }).catch(() => {});
        return;
      }

      const supportingText =
        posterSupportingText.trim() ||
        caption.trim().split(/[.!?](?:\\s|$)/)[0] ||
        business.description ||
        `Professional ${business.category || "local"} services you can trust.`;
      const posterData = await composeMarketingPoster({
        backgroundUrl: `${API_BASE_URL}${backgroundMediaUrl}`,
        business,
        headline: posterHeadline.trim() || topic.trim(),
        supportingText,
        ctaText: posterCtaText.trim() || cta.trim() || "Contact us today",
      });

      if (imageId !== imageRequestId.current) {
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: backgroundMediaUrl }).catch(() => {});
        return;
      }

      const poster = await saveMarketingPoster({
        businessId: business._id,
        imageData: posterData,
      });
      if (!poster.mediaUrl || !poster.mediaUrl.startsWith(`/temp/${userId}/${business._id}/`)) {
        throw new Error("The server returned an invalid poster reference. Please try again.");
      }

      if (imageId !== imageRequestId.current) {
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: poster.mediaUrl }).catch(() => {});
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: backgroundMediaUrl }).catch(() => {});
        return;
      }

      setGeneratedImageUrl(poster.mediaUrl);
      setImageRemaining(Number.isInteger(result.remainingToday) ? result.remainingToday : null);
      setSavedPost(null);

      // Keep only the finished poster; the raw AI background is no longer needed.
      await deleteGeneratedImage({ businessId: business._id, mediaUrl: backgroundMediaUrl }).catch(() => {});
      if (previousImageUrl && !previousImageBelongsToSavedPost) {
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: previousImageUrl }).catch(() => {});
      }
    } catch (e) {
      if (imageId === imageRequestId.current) {
        // If poster composition or saving fails after background generation, preserve that usable image.
        if (backgroundMediaUrl) setGeneratedImageUrl(backgroundMediaUrl);
        setImageError(getErrorMessage(e, "Couldn't generate the marketing poster."));
      } else if (backgroundMediaUrl) {
        await deleteGeneratedImage({ businessId: business._id, mediaUrl: backgroundMediaUrl }).catch(() => {});
      }
    } finally {
      if (imageId === imageRequestId.current) setImageGenerating(false);
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
      await createPost({
        businessId: business._id,
        title: topic.trim().slice(0, 100) || null,
        content: finalText,
        mediaUrls: generatedImageUrl ? [generatedImageUrl] : [],
        platforms: [producedFor?.platform || platform],
      });

      // The Post now owns the staged image. Clear the editor but do not delete that media.
      resetFields({ keepStagedImage: true });
      toast.success("Saved as a draft", {
        message: generatedImageUrl
          ? "Your AI-generated image was attached. The fields are ready for your next post."
          : "Your draft is saved. The fields are ready for your next post.",
      });
    } catch (e) {
      toast.error("Couldn't save the draft", { message: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  const targetPlatform = producedFor?.platform || platform;
  const overLimit = targetPlatform === "instagram" && (finalText.length > INSTAGRAM_CAPTION_LIMIT || hashtags.length > INSTAGRAM_HASHTAG_LIMIT);
  const generatedImagePreview = generatedImageUrl ? `${API_BASE_URL}${generatedImageUrl}` : null;

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="Content Studio"
        description="Create on-brand campaign visuals and ready-to-edit captions, all in one place."
      />

      {restoredDraft && (
        <Alert tone="info" className="mb-6" title="Your previous work has been restored">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>Your generated content and edits for {business.name} are back. You can continue editing or save them as a post draft.</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => resetFields()} disabled={generating || saving}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset fields
            </Button>
          </div>
        </Alert>
      )}

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

              <Button type="submit" className="w-full" loading={generating} disabled={generating || saving || imageGenerating}>
                <Sparkles className="h-4 w-4" aria-hidden /> {original ? "Generate new version" : "Generate content"}
              </Button>
            </CardBody>
          </Card>
        </form>

        <div className="space-y-4">
      <Card className="overflow-hidden border-brand-200">
        <CardHeader
          title="Design your campaign poster"
          description="Generate the artwork, then add your business details and promotional copy automatically."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI image
            </span>
          }
        />
        <CardBody className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="space-y-3">
              <Textarea
                label="AI design prompt"
                rows={4}
                value={visualPrompt}
                onChange={(e) => setVisualPrompt(e.target.value)}
                maxLength={600}
                hint="Describe the photo, mood, colours and art direction. The app adds the exact poster text and business details afterward."
                placeholder="e.g. Modern premium real estate campaign, contemporary building, warm golden-hour light, deep teal and cream palette, cinematic commercial photography."
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Text on your poster</p>
              <Input
                label="Headline (optional)"
                value={posterHeadline}
                onChange={(e) => setPosterHeadline(e.target.value)}
                maxLength={90}
                placeholder={topic || "e.g. Build your dream home"}
              />
              <Textarea
                label="Supporting text (optional)"
                rows={2}
                value={posterSupportingText}
                onChange={(e) => setPosterSupportingText(e.target.value)}
                maxLength={180}
                placeholder="A short benefit or service description"
              />
              <Input
                label="Button text (optional)"
                value={posterCtaText}
                onChange={(e) => setPosterCtaText(e.target.value)}
                maxLength={30}
                placeholder={cta || "Contact us today"}
              />
              <p className="text-xs text-muted">Business name, logo, category, address and phone are added from the selected business profile where available.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generateImageAsset} loading={imageGenerating} disabled={imageGenerating || !topic.trim()}>
                <ImagePlus className="h-4 w-4" aria-hidden /> Generate poster
              </Button>
              <span className="text-xs text-muted">1080 × 1080 · AI artwork + branded layout</span>
            </div>
            {imageRemaining !== null && (
              <p className="text-xs text-muted">{imageRemaining} of the shared daily app-wide image generations remaining.</p>
            )}
            {!topic.trim() && (
              <p className="text-xs text-muted">Add a campaign topic in the setup panel to enable image generation.</p>
            )}
            {imageError && <Alert tone="danger" title="Image generation failed">{imageError}</Alert>}
          </div>

          <div className="space-y-2">
            <div
              role="img"
              aria-label={generatedImagePreview ? `AI-designed marketing poster for ${business.name}` : "Preview area for your marketing poster"}
              className={`relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-canvas bg-center bg-no-repeat ${generatedImagePreview ? "bg-cover" : "bg-contain"}`}
              style={generatedImagePreview ? { backgroundImage: `url("${generatedImagePreview}")` } : undefined}
            >
              {!generatedImagePreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <ImagePlus className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium">Your image preview</p>
                  <p className="mt-1 max-w-xs text-xs text-muted">Your finished promotional poster will appear here.</p>
                </div>
              )}
              {generatedImagePreview && (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm">
                  AI generated
                </span>
              )}
              {imageGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 text-sm font-medium text-ink backdrop-blur-[2px]" role="status">
                  <RefreshCw className="h-5 w-5 animate-spin text-brand-700" aria-hidden />
                  Creating your image…
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              {generatedImagePreview
                ? "This designed poster will be attached when you save the post as a draft."
                : "Your finished square poster is ready for Instagram and Facebook."}
            </p>
          </div>
        </CardBody>
      </Card>

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
                  {targetPlatform === "instagram" && !generatedImageUrl && (
                    <Alert tone="info">Instagram posts need an image. Generate one below or upload an image after opening the draft.</Alert>
                  )}
                  {generatedImageUrl && (
                    <Alert tone="success">
                      Your AI-generated image will be attached to the draft. It remains in temporary storage until you schedule or publish the post.
                    </Alert>
                  )}

                  {savedPost ? (
                    <Alert tone="success" title="Draft saved">
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ButtonLink size="sm" href={`/posts/${savedPost._id}`}>{generatedImageUrl ? "Open draft" : "Open draft & upload media"}</ButtonLink>
                        {!generatedImageUrl && (
                          <Button size="sm" variant="secondary" onClick={() => setSavedPost(null)}>Save another copy</Button>
                        )}
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
