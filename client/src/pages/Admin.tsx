import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminStats } from "@/components/AdminStats";
import { BookingsTable } from "@/components/BookingsTable";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Admin() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="p-8 space-y-8">
          <AdminStats />
          <BookingsTable />
        </main>
      </div>
    </div>
  );
}
