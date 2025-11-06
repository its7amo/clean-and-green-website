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
import type { Invoice, Booking, BusinessSettings, Service } from "@shared/schema";
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
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  discount: z.number().min(0, "Discount must be positive").default(0),
  discountDescription: z.string().optional().nullable(),
  taxPercentage: z.number().min(0).max(100, "Tax percentage must be between 0-100"),
  tax: z.number().min(0, "Tax must be positive"),
  total: z.number().positive("Total must be greater than zero"),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine((data) => data.discount <= data.amount, {
  message: "Discount cannot exceed the amount",
  path: ["discount"],
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

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
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
      discount: 0,
      discountDescription: null,
      taxPercentage: 8.5,
      tax: 0,
      total: 0,
      status: "draft",
      dueDate: null,
      notes: null,
    },
  });

  const watchAmount = form.watch("amount");
  const watchDiscount = form.watch("discount");
  const watchTaxPercentage = form.watch("taxPercentage");

  // Auto-calculate tax and total
  useEffect(() => {
    const subtotal = Math.max(0, watchAmount - watchDiscount);
    const taxAmount = (subtotal * watchTaxPercentage) / 100;
    const roundedTax = Math.round(taxAmount * 100) / 100;
    form.setValue("tax", roundedTax);
    form.setValue("total", subtotal + roundedTax);
  }, [watchAmount, watchDiscount, watchTaxPercentage, form]);

  useEffect(() => {
    if (editingInvoice) {
      const amountInDollars = editingInvoice.amount / 100;
      const discountInDollars = (editingInvoice.discountAmount || 0) / 100;
      const subtotal = amountInDollars - discountInDollars;
      const taxInDollars = editingInvoice.tax / 100;
      const taxPercentage = subtotal > 0 ? (taxInDollars / subtotal) * 100 : 8.5;
      
      form.reset({
        invoiceNumber: editingInvoice.invoiceNumber,
        bookingId: editingInvoice.bookingId || null,
        customerName: editingInvoice.customerName,
        customerEmail: editingInvoice.customerEmail,
        customerPhone: editingInvoice.customerPhone,
        customerAddress: editingInvoice.customerAddress,
        serviceDescription: editingInvoice.serviceDescription,
        amount: amountInDollars,
        discount: discountInDollars,
        discountDescription: editingInvoice.discountDescription || null,
        taxPercentage: Math.round(taxPercentage * 10) / 10,
        tax: taxInDollars,
        total: (editingInvoice.total / 100),
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
        discount: 0,
        discountDescription: null,
        taxPercentage: 8.5,
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
        invoiceNumber: data.invoiceNumber,
        bookingId: data.bookingId || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        serviceDescription: data.serviceDescription,
        amount: Math.round(data.amount * 100),
        discountAmount: Math.round(data.discount * 100),
        discountDescription: data.discountDescription || null,
        tax: Math.round(data.tax * 100),
        total: Math.round(data.total * 100),
        status: data.status,
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
        invoiceNumber: data.invoiceNumber,
        bookingId: data.bookingId || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        serviceDescription: data.serviceDescription,
        amount: Math.round(data.amount * 100),
        discountAmount: Math.round(data.discount * 100),
        discountDescription: data.discountDescription || null,
        tax: Math.round(data.tax * 100),
        total: Math.round(data.total * 100),
        status: data.status,
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
    // Validate that promo bookings have actual price set
    if (data.bookingId) {
      const booking = bookings?.find(b => b.id === data.bookingId);
      if (booking?.promoCode && !booking.actualPrice) {
        toast({
          title: "Cannot create invoice",
          description: `This booking has promo code "${booking.promoCode}" but no actual price set. Please set the actual quote price in the booking details first.`,
          variant: "destructive",
        });
        return;
      }
    }
    
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
    const taxPercentage = form.getValues("taxPercentage");
    form.setValue("taxPercentage", taxPercentage);
    toast({
      title: "Tax calculated",
      description: `Tax set to ${taxPercentage}%`,
    });
  };

  const handleBookingSelect = (bookingId: string) => {
    if (!bookingId || bookingId === "none") {
      form.setValue("bookingId", null);
      return;
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      form.setValue("customerName", booking.name);
      form.setValue("customerEmail", booking.email);
      form.setValue("customerPhone", booking.phone);
      form.setValue("customerAddress", booking.address);
      
      // Build service description
      let serviceDesc = `${booking.service} - ${booking.propertySize}`;
      form.setValue("serviceDescription", serviceDesc);
      
      const discountInCents = booking.discountAmount || 0;
      
      // Use actualPrice if set (for promo code bookings), otherwise use service basePrice
      if (booking.actualPrice) {
        // Actual price already has discount recalculated - use it directly
        const finalAmountInDollars = Math.max(0, (booking.actualPrice - discountInCents) / 100);
        form.setValue("amount", finalAmountInDollars);
        
        toast({
          title: "Booking loaded",
          description: booking.promoCode 
            ? `Using actual price $${(booking.actualPrice / 100).toFixed(2)} with promo discount $${(discountInCents / 100).toFixed(2)}`
            : "Booking information loaded successfully",
        });
      } else if (booking.promoCode && !booking.actualPrice) {
        // Has promo code but no actual price set - clear amount and require admin to set actual price first
        form.setValue("amount", 0);
        toast({
          title: "Action required",
          description: `This booking has promo code "${booking.promoCode}". Please set the actual quote price in the booking details first, then reload this booking to create an invoice.`,
          variant: "destructive",
        });
      } else {
        // No promo code - use service base price if available
        const service = services.find(s => s.name.toLowerCase().includes(booking.service.toLowerCase()));
        if (service && service.basePrice > 0) {
          const finalAmountInDollars = Math.max(0, (service.basePrice - discountInCents) / 100);
          form.setValue("amount", finalAmountInDollars);
          
          toast({
            title: "Booking loaded",
            description: "Booking information loaded successfully",
          });
        } else {
          // Service not found - leave amount blank for manual entry
          toast({
            title: "Booking loaded",
            description: `Service pricing not found for "${booking.service}". Please enter the amount manually.`,
            variant: "destructive",
          });
        }
      }
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    // Fetch booking to get promo code info
    let booking: Booking | null = null;
    let service: Service | null = null;
    if (invoice.bookingId) {
      booking = bookings.find(b => b.id === invoice.bookingId) || null;
      if (booking && booking.service) {
        service = services.find(s => s.name.toLowerCase().includes(booking!.service.toLowerCase())) || null;
      }
    }

    const doc = new jsPDF();
    const businessName = settings?.businessName || "Clean & Green";
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Professional color palette
    const primaryGreen = [39, 174, 96]; // Modern green
    const darkGreen = [27, 120, 66]; // Darker green for accents
    const lightGray = [248, 249, 250];
    const mediumGray = [108, 117, 125];
    const darkGray = [52, 58, 64];

    // ===== HEADER SECTION =====
    // Top green bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(businessName, 20, 22);
    
    // Business tagline
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Eco-Friendly Cleaning Solutions", 20, 28);

    // ===== INVOICE TITLE & INFO (Two columns) =====
    let yPos = 50;
    
    // Left column - INVOICE title
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, yPos);
    
    // Right column - Invoice metadata
    const rightColX = pageWidth - 70;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    
    let rightYPos = yPos - 12;
    doc.text("Invoice Number", rightColX, rightYPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(invoice.invoiceNumber, rightColX, rightYPos + 5);
    
    rightYPos += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text("Invoice Date", rightColX, rightYPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(format(new Date(invoice.createdAt), "MMM dd, yyyy"), rightColX, rightYPos + 5);
    
    if (invoice.dueDate) {
      rightYPos += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text("Due Date", rightColX, rightYPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(format(new Date(invoice.dueDate), "MMM dd, yyyy"), rightColX, rightYPos + 5);
    }
    
    // Status badge
    rightYPos += 12;
    const statusColors: Record<string, number[]> = {
      paid: [40, 167, 69],
      sent: [0, 123, 255],
      overdue: [220, 53, 69],
      draft: [108, 117, 125]
    };
    const statusColor = statusColors[invoice.status] || statusColors.draft;
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(rightColX - 2, rightYPos - 4, 42, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status.toUpperCase(), rightColX + 21, rightYPos + 1.5, { align: 'center' });

    // ===== BILL TO SECTION =====
    yPos = 85;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customerName, 20, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    yPos += 6;
    doc.text(invoice.customerEmail, 20, yPos);
    yPos += 5;
    doc.text(invoice.customerPhone, 20, yPos);
    yPos += 5;
    const addressLines = doc.splitTextToSize(invoice.customerAddress, 160);
    doc.text(addressLines, 20, yPos);
    yPos += addressLines.length * 5 + 15;

    // ===== SERVICE DETAILS TABLE =====
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE DETAILS", 20, yPos);
    yPos += 8;
    
    // Table header
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Description", 25, yPos + 1);
    doc.text("Amount", pageWidth - 25, yPos + 1, { align: 'right' });
    
    yPos += 10;
    
    // Service description
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    const serviceLines = doc.splitTextToSize(invoice.serviceDescription, pageWidth - 100);
    doc.text(serviceLines, 25, yPos);
    yPos += Math.max(serviceLines.length * 5, 5) + 5;
    
    // Divider line
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // ===== PRICING BREAKDOWN =====
    const rightAlign = pageWidth - 25;
    const labelX = pageWidth - 80;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    
    // Show base price and discount if promo code was used
    if (booking?.promoCode) {
      const basePrice = booking.actualPrice || (service?.basePrice || 0);
      const discount = booking.discountAmount || 0;
      
      doc.text("Service Price", labelX, yPos);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(formatCurrency(basePrice), rightAlign, yPos, { align: 'right' });
      
      yPos += 6;
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text(`Discount (${booking.promoCode})`, labelX, yPos);
      doc.text(`-${formatCurrency(discount)}`, rightAlign, yPos, { align: 'right' });
      
      yPos += 6;
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text("Subtotal", labelX, yPos);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(formatCurrency(invoice.amount), rightAlign, yPos, { align: 'right' });
    } else if (invoice.discountAmount && invoice.discountAmount > 0) {
      // Show custom discount
      const baseAmount = invoice.amount + invoice.discountAmount;
      
      doc.text("Amount", labelX, yPos);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(formatCurrency(baseAmount), rightAlign, yPos, { align: 'right' });
      
      yPos += 6;
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      const discountLabel = invoice.discountDescription 
        ? `Discount (${invoice.discountDescription})` 
        : "Discount";
      doc.text(discountLabel, labelX, yPos);
      doc.text(`-${formatCurrency(invoice.discountAmount)}`, rightAlign, yPos, { align: 'right' });
      
      yPos += 6;
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text("Subtotal", labelX, yPos);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(formatCurrency(invoice.amount), rightAlign, yPos, { align: 'right' });
    } else {
      doc.text("Subtotal", labelX, yPos);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(formatCurrency(invoice.amount), rightAlign, yPos, { align: 'right' });
    }
    
    yPos += 6;
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text("Tax", labelX, yPos);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(formatCurrency(invoice.tax), rightAlign, yPos, { align: 'right' });
    
    // Total line with background
    yPos += 10;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(labelX - 5, yPos - 6, rightAlign - labelX + 10, 12, 2, 2, 'F');
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.text("TOTAL", labelX, yPos);
    doc.text(formatCurrency(invoice.total), rightAlign, yPos, { align: 'right' });

    // ===== NOTES SECTION =====
    if (invoice.notes) {
      yPos += 20;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text("NOTES", 20, yPos);
      
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
      doc.text(notesLines, 20, yPos);
    }

    // ===== FOOTER =====
    const footerY = pageHeight - 25;
    
    // Footer divider
    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(1);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    // Thank you message
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text("Thank you for choosing " + businessName + "!", pageWidth / 2, footerY, { align: 'center' });
    
    // Contact info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    const contactInfo = settings?.email || "info@cleanandgreen.com";
    const phone = settings?.phone || "(555) 123-4567";
    doc.text(`${phone} | ${contactInfo}`, pageWidth / 2, footerY + 6, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text("Eco-friendly cleaning services in Oklahoma", pageWidth / 2, footerY + 10, { align: 'center' });

    // Save the PDF
    doc.save(`${invoice.invoiceNumber}_${Date.now()}.pdf`);
    
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
                                field.onChange(value === "none" ? null : value);
                                handleBookingSelect(value);
                              }}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-booking">
                                  <SelectValue placeholder="Select a booking or leave empty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None (Custom Invoice)</SelectItem>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  data-testid="input-amount"
                                  placeholder="99.00"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                ${field.value.toFixed(2)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="discount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  data-testid="input-discount"
                                  placeholder="0.00"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                -${field.value.toFixed(2)}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="discountDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Reason/Description (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                data-testid="input-discount-description"
                                placeholder="e.g., First-time customer discount, Loyalty reward, etc."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taxPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Percentage</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.1"
                                  data-testid="input-tax-percentage"
                                  placeholder="8.5"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                {field.value}%
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax (auto-calculated)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  data-testid="input-tax"
                                  readOnly
                                  className="bg-muted"
                                />
                              </FormControl>
                              <FormDescription>
                                ${field.value.toFixed(2)}
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
                              <FormLabel>Total (auto-calculated)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  data-testid="input-total"
                                  readOnly
                                  className="bg-muted"
                                />
                              </FormControl>
                              <FormDescription>
                                ${field.value.toFixed(2)}
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
