import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPromoCodeSchema, type PromoCode } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const promoCodeFormSchema = insertPromoCodeSchema.extend({
  validFrom: z.string().min(1, "Start date is required"),
  validTo: z.string().min(1, "End date is required"),
  maxUses: z.string().optional(),
});

type PromoCodeFormData = z.infer<typeof promoCodeFormSchema>;

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/promo-codes"],
  });

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      validFrom: "",
      validTo: "",
      maxUses: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const payload = {
        ...data,
        code: data.code.toUpperCase(),
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      };
      await apiRequest("POST", "/api/promo-codes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/active-promo"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Promo code created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoCodeFormData> }) => {
      const payload = {
        ...data,
        code: data.code?.toUpperCase(),
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      };
      await apiRequest("PATCH", `/api/promo-codes/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/active-promo"] });
      setIsDialogOpen(false);
      setEditingPromoCode(null);
      form.reset();
      toast({
        title: "Success",
        description: "Promo code updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update promo code",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/promo-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/active-promo"] });
      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PromoCodeFormData) => {
    if (editingPromoCode) {
      updateMutation.mutate({ id: editingPromoCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    form.reset({
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType as "percentage" | "fixed",
      discountValue: promoCode.discountValue,
      validFrom: format(new Date(promoCode.validFrom), "yyyy-MM-dd"),
      validTo: format(new Date(promoCode.validTo), "yyyy-MM-dd"),
      maxUses: promoCode.maxUses?.toString() || "",
      status: promoCode.status as "active" | "inactive",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingPromoCode(null);
      form.reset();
    }
  };

  const filteredPromoCodes = promoCodes?.filter(promoCode =>
    promoCode.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promoCode.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Promo Codes</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-promo">
              <Plus className="h-4 w-4 mr-2" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromoCode ? "Edit Promo Code" : "Create New Promo Code"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promo Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SUMMER2024" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-promo-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Summer discount - 20% off all services" 
                          {...field}
                          data-testid="input-promo-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-discount-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("discountType") === "percentage" ? "Percentage (0-100)" : "Amount (cents)"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-discount-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid From</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid To</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Uses (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Unlimited" 
                            {...field}
                            data-testid="input-max-uses"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-promo">
                    {editingPromoCode ? "Update" : "Create"} Promo Code
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
        </CardHeader>
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by promo code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-promos"
            />
          </div>
        </div>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPromoCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-promos">
              {searchQuery ? "No promo codes match your search." : "No promo codes yet. Create one to get started!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromoCodes.map((promoCode) => (
                    <TableRow key={promoCode.id} data-testid={`row-promo-${promoCode.id}`}>
                      <TableCell className="font-mono font-bold" data-testid={`text-code-${promoCode.id}`}>
                        {promoCode.code}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{promoCode.description}</TableCell>
                      <TableCell>
                        {promoCode.discountType === "percentage"
                          ? `${promoCode.discountValue}%`
                          : `$${(promoCode.discountValue / 100).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(promoCode.validFrom), "MMM d, yyyy")} -{" "}
                        {format(new Date(promoCode.validTo), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {promoCode.currentUses} / {promoCode.maxUses || "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promoCode.status === "active" ? "default" : "secondary"}>
                          {promoCode.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(promoCode)}
                            data-testid={`button-edit-${promoCode.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(promoCode.id)}
                            data-testid={`button-delete-${promoCode.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
