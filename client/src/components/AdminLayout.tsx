import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  FileText,
  Users,
  Settings,
  LogOut,
  Leaf,
  Wrench,
  Image,
  HelpCircle,
  Receipt,
  UserCircle,
  Star,
  Mail,
  UsersRound,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
  AlertCircle,
  Tag,
  Repeat,
  MapPin,
  BarChart3,
  Gift,
  ChevronDown,
  Zap,
  Briefcase,
  UsersIcon,
  MessagesSquare,
  TrendingUp,
  Cog,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";

const menuGroups = [
  {
    title: "Overview",
    icon: Zap,
    defaultOpen: true,
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    title: "Operations",
    icon: Briefcase,
    defaultOpen: true,
    items: [
      { href: "/admin/bookings", icon: Calendar, label: "Bookings" },
      { href: "/admin/calendar", icon: CalendarDays, label: "Calendar" },
      { href: "/admin/recurring-bookings", icon: Repeat, label: "Recurring" },
      { href: "/admin/cancellations", icon: AlertTriangle, label: "Cancellations" },
      { href: "/admin/quotes", icon: FileText, label: "Quotes" },
      { href: "/admin/invoices", icon: Receipt, label: "Invoices" },
    ],
  },
  {
    title: "People",
    icon: UsersIcon,
    defaultOpen: false,
    items: [
      { href: "/admin/customers", icon: Users, label: "Customers" },
      { href: "/admin/employees", icon: UserCircle, label: "Employees" },
      { href: "/admin/team", icon: UsersRound, label: "Team Management" },
    ],
  },
  {
    title: "Communication",
    icon: MessagesSquare,
    defaultOpen: false,
    items: [
      { href: "/admin/messages", icon: MessageSquare, label: "Messages" },
      { href: "/admin/reviews", icon: Star, label: "Reviews" },
      { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
      { href: "/admin/automated-emails", icon: Mail, label: "Email Automation" },
    ],
  },
  {
    title: "Marketing",
    icon: TrendingUp,
    defaultOpen: false,
    items: [
      { href: "/admin/referrals", icon: Gift, label: "Referral Program" },
      { href: "/admin/promo-codes", icon: Tag, label: "Promo Codes" },
      { href: "/admin/alerts", icon: AlertCircle, label: "Anomaly Alerts" },
      { href: "/admin/activity-logs", icon: ClipboardList, label: "Activity Logs" },
    ],
  },
  {
    title: "Configuration",
    icon: Cog,
    defaultOpen: false,
    items: [
      { href: "/admin/cms", icon: FileText, label: "Content Editor" },
      { href: "/admin/services", icon: Wrench, label: "Services" },
      { href: "/admin/service-areas", icon: MapPin, label: "Service Areas" },
      { href: "/admin/gallery", icon: Image, label: "Gallery" },
      { href: "/admin/faq", icon: HelpCircle, label: "FAQ" },
      { href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiRequest("POST", "/api/logout", {});
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <Leaf className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl">Admin Panel</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {menuGroups.map((group) => (
                <Collapsible key={group.title} defaultOpen={group.defaultOpen}>
                  <SidebarGroup>
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover-elevate px-4 py-2 rounded-md mx-2">
                        <div className="flex items-center gap-2">
                          <group.icon className="h-4 w-4" />
                          <span className="font-semibold">{group.title}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => {
                            const isActive = location === item.href;
                            return (
                              <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={isActive}>
                                  <Link href={item.href} data-testid={`link-admin-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              ))}
            </div>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} disabled={isLoggingOut} data-testid="button-logout">
                    <LogOut className="h-5 w-5" />
                    <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <GlobalSearch />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
