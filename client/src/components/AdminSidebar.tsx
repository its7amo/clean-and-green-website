import { Link, useLocation } from "wouter";
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
  UserCircle,
  Star,
  Mail,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/bookings", icon: Calendar, label: "Bookings" },
  { href: "/admin/quotes", icon: FileText, label: "Quotes" },
  { href: "/admin/invoices", icon: Receipt, label: "Invoices" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/employees", icon: UserCircle, label: "Employees" },
  { href: "/admin/reviews", icon: Star, label: "Reviews" },
  { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
  { href: "/admin/team", icon: UsersRound, label: "Team" },
  { href: "/admin/services", icon: Wrench, label: "Services" },
  { href: "/admin/gallery", icon: Image, label: "Gallery" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-screen bg-sidebar border-r flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                  }`}
                  data-testid={`link-admin-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3" data-testid="button-logout">
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
