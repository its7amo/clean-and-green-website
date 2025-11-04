import { AdminSidebar } from "@/components/AdminSidebar";
import { QuotesTable } from "@/components/QuotesTable";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminQuotes() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold">Quote Requests</h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="p-8">
          <QuotesTable />
        </main>
      </div>
    </div>
  );
}
