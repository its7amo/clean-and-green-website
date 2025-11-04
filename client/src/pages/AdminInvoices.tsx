import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, Booking, BusinessSettings } from "@shared/schema";
import { Loader2, Plus, Pencil, Trash2, Download, Calculator } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  bookingId: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerAddress: z.string().min(1, "Address is required"),
  serviceDescription: z.string().min(1, "Service description is required"),
  amount: z.number().min(0, "Amount must be positive"),
  tax: z.number().min(0, "Tax must be positive"),
  total: z.number().min(0, "Total must be positive"),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// Generate invoice number in format: INV-YYYY-MMDD-XXXX
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${month}${day}-${random}`;
}

// Format cents to dollars
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminInvoices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isDialogOpen,
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      bookingId: null,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerAddress: "",
      serviceDescription: "",
      amount: 0,
      tax: 0,
      total: 0,
      status: "draft",
      dueDate: null,
      notes: null,
    },
  });

  const watchAmount = form.watch("amount");
  const watchTax = form.watch("tax");

  // Auto-calculate total
  useEffect(() => {
    const total = watchAmount + watchTax;
    form.setValue("total", total);
  }, [watchAmount, watchTax, form]);

  useEffect(() => {
    if (editingInvoice) {
      form.reset({
        invoiceNumber: editingInvoice.invoiceNumber,
        bookingId: editingInvoice.bookingId || null,
        customerName: editingInvoice.customerName,
        customerEmail: editingInvoice.customerEmail,
        customerPhone: editingInvoice.customerPhone,
        customerAddress: editingInvoice.customerAddress,
        serviceDescription: editingInvoice.serviceDescription,
        amount: editingInvoice.amount,
        tax: editingInvoice.tax,
        total: editingInvoice.total,
        status: editingInvoice.status as "draft" | "sent" | "paid" | "overdue",
        dueDate: editingInvoice.dueDate ? format(new Date(editingInvoice.dueDate), "yyyy-MM-dd") : null,
        notes: editingInvoice.notes || null,
      });
    } else {
      form.reset({
        invoiceNumber: generateInvoiceNumber(),
        bookingId: null,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        serviceDescription: "",
        amount: 0,
        tax: 0,
        total: 0,
        status: "draft",
        dueDate: null,
        notes: null,
      });
    }
  }, [editingInvoice, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const payload = {
        ...data,
        bookingId: data.bookingId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        notes: data.notes || null,
      };
      const res = await apiRequest("POST", "/api/invoices", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      setEditingInvoice(null);
      form.reset();
      toast({
        title: "Invoice created",
        description: "Invoice has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceFormValues }) => {
      const payload = {
        ...data,
        bookingId: data.bookingId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        notes: data.notes || null,
      };
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      setEditingInvoice(null);
      form.reset();
      toast({
        title: "Invoice updated",
        description: "Invoice has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice deleted",
        description: "Invoice has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingInvoice(null);
      form.reset();
    }
  };

  const handleAutoCalculateTax = () => {
    const amount = form.getValues("amount");
    const taxAmount = Math.round(amount * 0.085);
    form.setValue("tax", taxAmount);
    toast({
      title: "Tax calculated",
      description: `Tax set to ${formatCurrency(taxAmount)} (8.5% of amount)`,
    });
  };

  const handleBookingSelect = (bookingId: string) => {
    if (!bookingId) {
      form.setValue("bookingId", null);
      return;
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      form.setValue("customerName", booking.name);
      form.setValue("customerEmail", booking.email);
      form.setValue("customerPhone", booking.phone);
      form.setValue("customerAddress", booking.address);
      form.setValue("serviceDescription", `${booking.service} - ${booking.propertySize}`);
    }
  };

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    const businessName = settings?.businessName || "Clean and Green";
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Company green theme color
    const primaryGreen = [34, 139, 34]; // Forest green

    // Header with business name
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(businessName, pageWidth / 2, 25, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Invoice title and number
    let yPos = 55;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, yPos);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    yPos += 10;
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, yPos);
    
    yPos += 7;
    doc.text(`Date: ${format(new Date(invoice.createdAt), "MMM dd, yyyy")}`, 20, yPos);
    
    if (invoice.dueDate) {
      yPos += 7;
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMM dd, yyyy")}`, 20, yPos);
    }

    // Status badge
    yPos += 7;
    doc.setFont("helvetica", "bold");
    const statusText = `Status: ${invoice.status.toUpperCase()}`;
    doc.text(statusText, 20, yPos);

    // Bill To section
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, yPos);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    doc.text(invoice.customerName, 20, yPos);
    yPos += 6;
    doc.text(invoice.customerEmail, 20, yPos);
    yPos += 6;
    doc.text(invoice.customerPhone, 20, yPos);
    yPos += 6;
    const addressLines = doc.splitTextToSize(invoice.customerAddress, 170);
    doc.text(addressLines, 20, yPos);
    yPos += addressLines.length * 6;

    // Service Description section
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Service Description", 20, yPos);
    
    yPos += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 25, yPos);
    
    yPos += 10;
    doc.setFont("helvetica", "normal");
    const serviceLines = doc.splitTextToSize(invoice.serviceDescription, pageWidth - 50);
    doc.text(serviceLines, 25, yPos);
    yPos += serviceLines.length * 6 + 10;

    // Amount breakdown
    const rightAlign = pageWidth - 20;
    const labelX = pageWidth - 90;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", labelX, yPos);
    doc.text(formatCurrency(invoice.amount), rightAlign, yPos, { align: 'right' });
    
    yPos += 7;
    doc.text("Tax:", labelX, yPos);
    doc.text(formatCurrency(invoice.tax), rightAlign, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(0.5);
    doc.line(labelX - 5, yPos - 3, rightAlign, yPos - 3);
    doc.text("Total:", labelX, yPos);
    doc.text(formatCurrency(invoice.total), rightAlign, yPos, { align: 'right' });

    // Notes section if present
    if (invoice.notes) {
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, yPos);
      
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
      doc.text(notesLines, 20, yPos);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(128, 128, 128);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    doc.save(`${invoice.invoiceNumber}.pdf`);
    
    toast({
      title: "PDF Generated",
      description: `Invoice ${invoice.invoiceNumber} has been downloaded.`,
    });
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "paid":
        return "default";
      case "sent":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Invoices
        </h1>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Manage Invoices</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-invoice">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingInvoice
                        ? "Update the invoice details below."
                        : "Fill in the invoice details below."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-invoice-number"
                                placeholder="INV-2024-1104-1234"
                                readOnly
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bookingId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Booking (Optional)</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleBookingSelect(value);
                              }}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-booking">
                                  <SelectValue placeholder="Select a booking or leave empty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None (Custom Invoice)</SelectItem>
                                {bookings.map((booking) => (
                                  <SelectItem key={booking.id} value={booking.id}>
                                    {booking.name} - {booking.service} ({format(new Date(booking.date), "MMM dd, yyyy")})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a booking to auto-fill customer details
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-customer-name"
                                  placeholder="John Doe"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Email</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  data-testid="input-customer-email"
                                  placeholder="john@example.com"
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
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Phone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-customer-phone"
                                  placeholder="(555) 123-4567"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customerAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Address</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-customer-address"
                                  placeholder="123 Main St, City, State"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="serviceDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-service-description"
                                placeholder="Describe the service provided..."
                                className="min-h-24"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (cents)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  data-testid="input-amount"
                                  placeholder="9900"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                ${(field.value / 100).toFixed(2)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax (cents)</FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    data-testid="input-tax"
                                    placeholder="842"
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={handleAutoCalculateTax}
                                  data-testid="button-calculate-tax"
                                  title="Auto-calculate at 8.5%"
                                >
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormDescription>
                                ${(field.value / 100).toFixed(2)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="total"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total (auto)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  data-testid="input-total"
                                  readOnly
                                />
                              </FormControl>
                              <FormDescription>
                                ${(field.value / 100).toFixed(2)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-status">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="sent">Sent</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="overdue">Overdue</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  value={field.value || ""}
                                  data-testid="input-due-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                data-testid="input-notes"
                                placeholder="Additional notes or payment instructions..."
                                className="min-h-24"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDialogChange(false)}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-submit-invoice"
                        >
                          {(createMutation.isPending || updateMutation.isPending) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingInvoice ? "Update" : "Create"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground" data-testid="text-no-invoices">
                  No invoices found. Create your first invoice to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell data-testid={`text-customer-name-${invoice.id}`}>
                          {invoice.customerName}
                        </TableCell>
                        <TableCell className="max-w-md truncate" data-testid={`text-service-${invoice.id}`}>
                          {invoice.serviceDescription}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${invoice.id}`}>
                          {formatCurrency(invoice.amount)}
                        </TableCell>
                        <TableCell data-testid={`text-tax-${invoice.id}`}>
                          {formatCurrency(invoice.tax)}
                        </TableCell>
                        <TableCell className="font-semibold" data-testid={`text-total-${invoice.id}`}>
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(invoice.status)} data-testid={`badge-status-${invoice.id}`}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-due-date-${invoice.id}`}>
                          {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => generatePDF(invoice)}
                              data-testid={`button-download-${invoice.id}`}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(invoice)}
                              data-testid={`button-edit-${invoice.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(invoice.id)}
                              data-testid={`button-delete-${invoice.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </AdminLayout>
  );
}
