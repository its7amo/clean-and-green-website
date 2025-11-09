import { AdminLayout } from "@/components/AdminLayout";
import { AdminStats } from "@/components/AdminStats";
import { QuickActions } from "@/components/QuickActions";
import { BookingsTable } from "@/components/BookingsTable";

export default function Admin() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <AdminStats />
        <QuickActions />
        <BookingsTable />
      </div>
    </AdminLayout>
  );
}
