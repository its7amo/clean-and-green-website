import { ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee } from "@shared/schema";
import type { Feature } from "@shared/permissions";
import { PERMISSION_METADATA } from "@shared/permissions";
import { Button } from "@/components/ui/button";
import { Leaf, LogOut, Home, FolderOpen } from "lucide-react";
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface EmployeeLayoutProps {
  children: ReactNode;
}

interface EmployeePermission {
  feature: Feature;
  actions: string[];
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: employee } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: permissions } = useQuery<EmployeePermission[]>({
    queryKey: ["/api/employee/permissions"],
    enabled: !!employee,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/employee/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/auth/user"] });
      toast({ title: "Logged out successfully" });
      window.location.href = "/employee/login";
    },
  });

  // Features that have employee-facing pages implemented
  const availableFeatures: Feature[] = [
    "bookings",
    "customers",
    "activity_logs",
    "quotes",
    "messages",
    "team",
    "reviews",
    "invoices",
    "newsletter",
    "employees",
  ];

  const menuItems = [
    {
      feature: null,
      title: "My Work",
      url: "/employee/dashboard",
      icon: Home,
    },
    ...PERMISSION_METADATA.filter(meta => {
      const hasPermission = permissions?.some(p => p.feature === meta.feature);
      const hasPage = availableFeatures.includes(meta.feature);
      return hasPermission && hasPage;
    }).map(meta => ({
      feature: meta.feature,
      title: meta.label,
      url: `/employee/${meta.feature}`,
      icon: FolderOpen,
    })),
  ];

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="font-bold text-sm">Clean & Green</h2>
                <p className="text-xs text-muted-foreground">Employee Portal</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-${item.feature || 'dashboard'}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="space-y-2">
              <div className="text-sm">
                <p className="font-medium">{employee?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{employee?.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
