import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { BookingsTable } from "@/components/BookingsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Customer } from "@shared/schema";

export default function AdminBookings() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: "residential",
    propertySize: "",
    date: "",
    timeSlot: "",
    promoCode: "",
    promoCodeId: null as string | null,
    discountAmount: 0,
  });

  // Fetch existing customers for autocomplete
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: createDialogOpen,
  });

  const validatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/promo-codes/validate", { code });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        setFormData(prev => ({
          ...prev,
          promoCodeId: data.promoCode.id,
          discountAmount: data.promoCode.discountValue,
        }));
        toast({
          title: "Promo code applied!",
          description: `Discount: ${data.promoCode.discountType === "percentage" ? `${data.promoCode.discountValue}%` : `$${(data.promoCode.discountValue / 100).toFixed(2)}`}`,
        });
      } else {
        setFormData(prev => ({ ...prev, promoCodeId: null, discountAmount: 0 }));
        toast({
          title: "Invalid promo code",
          description: data.message || "This promo code is not valid",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setFormData(prev => ({ ...prev, promoCodeId: null, discountAmount: 0 }));
      toast({
        title: "Error",
        description: "Failed to validate promo code",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        promoCodeId: data.promoCodeId,
      };
      const res = await apiRequest("POST", "/api/bookings/manual", payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create booking");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setCreateDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        service: "residential",
        propertySize: "",
        date: "",
        timeSlot: "",
        promoCode: "",
        promoCodeId: null,
        discountAmount: 0,
      });
      toast({
        title: "Booking created",
        description: "Manual booking (phone lead) has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.date || !formData.timeSlot) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Bookings</h1>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-booking">
            <Plus className="h-4 w-4 mr-2" />
            Create Booking
          </Button>
        </div>
        <BookingsTable />

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-booking">
            <DialogHeader>
              <DialogTitle>Create Manual Booking (Phone Lead)</DialogTitle>
              <DialogDescription>
                Create a new booking from a phone call or walk-in customer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer Name *</Label>
                <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerComboOpen}
                      className="w-full justify-between"
                      data-testid="button-select-customer"
                    >
                      {formData.name || "Select existing customer or type new name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type new customer name..."
                        value={formData.name}
                        onValueChange={(value) => setFormData({ ...formData, name: value })}
                        data-testid="input-booking-name"
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Type to add "{formData.name}" as new customer
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="Existing Customers">
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} (${customer.email})`}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  name: customer.name,
                                  email: customer.email,
                                  phone: customer.phone || "",
                                  address: customer.address || "",
                                });
                                setCustomerComboOpen(false);
                              }}
                              data-testid={`customer-option-${customer.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.email === customer.email ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{customer.name}</span>
                                <span className="text-xs text-muted-foreground">{customer.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  data-testid="input-booking-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-booking-phone"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, Oklahoma City, OK"
                  data-testid="input-booking-address"
                />
              </div>
              <div>
                <Label htmlFor="service">Service Type *</Label>
                <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                  <SelectTrigger id="service" data-testid="select-booking-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential Cleaning</SelectItem>
                    <SelectItem value="commercial">Commercial Cleaning</SelectItem>
                    <SelectItem value="deep">Deep Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="propertySize">Property Size</Label>
                <Input
                  id="propertySize"
                  value={formData.propertySize}
                  onChange={(e) => setFormData({ ...formData, propertySize: e.target.value })}
                  placeholder="1000 sq ft"
                  data-testid="input-booking-property-size"
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-booking-date"
                />
              </div>
              <div>
                <Label htmlFor="timeSlot">Time Slot *</Label>
                <Select value={formData.timeSlot} onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}>
                  <SelectTrigger id="timeSlot" data-testid="select-booking-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning (8am-12pm)">Morning (8am-12pm)</SelectItem>
                    <SelectItem value="Afternoon (12pm-4pm)">Afternoon (12pm-4pm)</SelectItem>
                    <SelectItem value="Evening (4pm-8pm)">Evening (4pm-8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="promo-code">Promo Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    value={formData.promoCode}
                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                    placeholder="Enter promo code"
                    data-testid="input-booking-promo-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validatePromoCodeMutation.mutate(formData.promoCode)}
                    disabled={!formData.promoCode || validatePromoCodeMutation.isPending}
                    data-testid="button-apply-promo"
                  >
                    {validatePromoCodeMutation.isPending ? "Checking..." : "Apply"}
                  </Button>
                </div>
                {formData.promoCodeId && (
                  <p className="text-sm text-primary font-medium mt-2" data-testid="text-promo-applied">
                    ✓ Promo code applied - Discount: ${(formData.discountAmount / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                data-testid="button-cancel-booking"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-booking"
              >
                {createMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
