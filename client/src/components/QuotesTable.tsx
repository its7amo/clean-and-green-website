import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  approved: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function QuotesTable() {
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/quotes/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading quotes...</p>
      </Card>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No quote requests yet</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Quote Requests</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Property Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover-elevate" data-testid={`quote-row-${quote.id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{quote.name}</div>
                  <div className="text-xs text-muted-foreground">{quote.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm max-w-xs">{quote.serviceType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{quote.propertySize}</div>
                  {quote.customSize && (
                    <div className="text-xs text-muted-foreground">{quote.customSize} sq ft</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={statusColors[quote.status as keyof typeof statusColors]}>
                    {quote.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{quote.phone}</div>
                  <div className="text-xs text-muted-foreground">{quote.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" data-testid={`button-view-quote-${quote.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {quote.status === "pending" && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleStatusUpdate(quote.id, "approved")}
                          data-testid={`button-approve-quote-${quote.id}`}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleStatusUpdate(quote.id, "rejected")}
                          data-testid={`button-reject-quote-${quote.id}`}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
