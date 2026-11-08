import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  Link2,
  ListChecks,
  MessageSquareText,
  QrCode,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Create",
    items: [
      { href: "/content-studio", label: "Content Studio", icon: Sparkles },
      { href: "/posts", label: "Posts", icon: FileText },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/audits", label: "Business audit", icon: ClipboardCheck },
      { href: "/recommendations", label: "Recommendations", icon: ListChecks },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/seo", label: "Website health", icon: Search },
      { href: "/seo/search-console", label: "Google search performance", icon: Globe },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/businesses", label: "Businesses", icon: Building2 },
      { href: "/qr-codes", label: "Feedback QR codes", icon: QrCode },
      { href: "/social-accounts", label: "Social accounts", icon: Link2 },
      { href: "/reviews", label: "Review moderation", icon: MessageSquareText },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
