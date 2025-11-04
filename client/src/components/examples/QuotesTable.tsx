import { QuotesTable } from '../QuotesTable';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function QuotesTableExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8">
        <QuotesTable />
      </div>
    </QueryClientProvider>
  );
}
