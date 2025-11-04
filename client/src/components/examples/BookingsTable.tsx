import { BookingsTable } from '../BookingsTable';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function BookingsTableExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8">
        <BookingsTable />
      </div>
    </QueryClientProvider>
  );
}
