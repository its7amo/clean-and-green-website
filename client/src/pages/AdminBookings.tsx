import { AdminLayout } from "@/components/AdminLayout";
import { BookingsTable } from "@/components/BookingsTable";

export default function AdminBookings() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <BookingsTable />
      </div>
    </AdminLayout>
  );
}
