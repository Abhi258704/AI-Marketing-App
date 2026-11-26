// Notifications from the backend carry only { type, businessId, title, message }.
// There is no post/audit/recommendation id, so we link to the relevant *section*
// and switch to the notification's business; we can't deep-link to a single item.
export function notificationTarget(n) {
  switch (n.type) {
    case "post_published":
    case "post_failed":
    case "post_partially_published":
      return { href: "/posts", label: "View posts" };
    case "audit_completed":
      return { href: "/audits", label: "View audit" };
    case "recommendation_completed":
      return { href: "/recommendations", label: "View recommendations" };
    default:
      return null;
  }
}

export const NOTIFICATION_TONES = {
  post_published: "success",
  post_failed: "danger",
  post_partially_published: "warning",
  audit_completed: "brand",
  recommendation_completed: "success",
  general: "neutral",
};
