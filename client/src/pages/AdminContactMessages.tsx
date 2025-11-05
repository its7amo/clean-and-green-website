import { AdminLayout } from "@/components/AdminLayout";
import { ContactMessagesTable } from "@/components/ContactMessagesTable";

export default function AdminContactMessages() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Contact Messages</h1>
        <ContactMessagesTable />
      </div>
    </AdminLayout>
  );
}
