import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText, Search } from "lucide-react";
import type { GlobalSearchResult } from "@shared/schema";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<GlobalSearchResult>({
    queryKey: ["/api/global-search", { q: debouncedQuery }],
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery("");
    setLocation(path);
  };

  const totalResults =
    (data?.bookings?.length || 0) +
    (data?.customers?.length || 0) +
    (data?.quotes?.length || 0);

  const showResults = debouncedQuery.trim().length >= 2;

  return (
    <>
      <Button
        variant="outline"
        className="relative justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search bookings, customers, quotes..."
        value={query}
        onValueChange={setQuery}
        data-testid="input-global-search"
      />
      <CommandList>
        {!showResults && (
          <CommandEmpty data-testid="search-empty-state">
            Type at least 2 characters to search
          </CommandEmpty>
        )}
        {showResults && isLoading && (
          <CommandEmpty data-testid="search-loading">
            <div className="flex items-center justify-center gap-2 py-6">
              <Search className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          </CommandEmpty>
        )}
        {showResults && !isLoading && totalResults === 0 && (
          <CommandEmpty data-testid="search-no-results">No results found</CommandEmpty>
        )}

        {data?.bookings && data.bookings.length > 0 && (
          <>
            <CommandGroup heading="Bookings">
              {data.bookings.map((booking) => (
                <CommandItem
                  key={booking.id}
                  onSelect={() => handleSelect(`/admin/bookings?id=${booking.id}`)}
                  data-testid={`search-result-booking-${booking.id}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {booking.email} • {booking.service}
                      </span>
                    </div>
                    <Badge variant={booking.status === "completed" ? "secondary" : "default"}>
                      {booking.status}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {data?.customers && data.customers.length > 0 && (
          <>
            <CommandGroup heading="Customers">
              {data.customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  onSelect={() => handleSelect(`/admin/customers/${customer.id}`)}
                  data-testid={`search-result-customer-${customer.id}`}
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-sm text-muted-foreground">{customer.email}</span>
                    </div>
                    <Badge variant="secondary">{customer.totalBookings} bookings</Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {data?.quotes && data.quotes.length > 0 && (
          <CommandGroup heading="Quotes">
            {data.quotes.map((quote) => (
              <CommandItem
                key={quote.id}
                onSelect={() => handleSelect(`/admin/quotes?id=${quote.id}`)}
                data-testid={`search-result-quote-${quote.id}`}
              >
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{quote.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {quote.email} • {quote.service}
                    </span>
                  </div>
                  <Badge variant={quote.status === "accepted" ? "secondary" : "default"}>
                    {quote.status}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
    </>
  );
}
