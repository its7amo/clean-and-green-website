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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Settings,
  LogOut,
  Leaf,
  Wrench,
  Image,
  HelpCircle,
  Receipt,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/bookings", icon: Calendar, label: "Bookings" },
  { href: "/admin/quotes", icon: FileText, label: "Quotes" },
  { href: "/admin/invoices", icon: Receipt, label: "Invoices" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/employees", icon: Users, label: "Employees" },
  { href: "/admin/services", icon: Wrench, label: "Services" },
  { href: "/admin/gallery", icon: Image, label: "Gallery" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
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

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href} data-testid={`link-admin-${item.label.toLowerCase()}`}>
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

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
            <ThemeToggle />
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
