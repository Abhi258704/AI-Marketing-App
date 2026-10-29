import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Link2,
  ListChecks,
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
      { href: "/audits", label: "Audits", icon: ClipboardCheck },
      { href: "/recommendations", label: "Recommendations", icon: ListChecks },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/businesses", label: "Businesses", icon: Building2 },
      { href: "/social-accounts", label: "Social accounts", icon: Link2 },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
