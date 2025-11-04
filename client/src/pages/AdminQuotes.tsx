import { AdminLayout } from "@/components/AdminLayout";
import { QuotesTable } from "@/components/QuotesTable";

export default function AdminQuotes() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Quote Requests</h1>
        <QuotesTable />
      </div>
    </AdminLayout>
  );
}
