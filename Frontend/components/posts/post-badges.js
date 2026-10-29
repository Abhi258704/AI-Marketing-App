import { Badge } from "@/components/ui/feedback";
import { platformLabel, statusMeta } from "@/lib/post-rules";
import { Facebook, Instagram } from "@/components/ui/brand-icons";

export function PostStatusBadge({ status, derived = false }) {
  const meta = statusMeta(status);
  return (
    <Badge
      tone={meta.tone}
      title={derived ? "Derived from publish results received in this browser" : undefined}
    >
      {meta.label}
      {derived && <span aria-hidden>*</span>}
    </Badge>
  );
}

const ICONS = { facebook: Facebook, instagram: Instagram };

export function PlatformBadges({ platforms = [] }) {
  if (!platforms.length) return <span className="text-xs text-muted">No platforms</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {platforms.map((p) => {
        const Icon = ICONS[p];
        return (
          <Badge key={p}>
            {Icon && <Icon className="h-3 w-3" aria-hidden />}
            {platformLabel(p)}
          </Badge>
        );
      })}
    </span>
  );
}
