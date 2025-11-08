import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, Edit, Trash2, UserPlus, Mail, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer, EmailTemplate } from "@shared/schema";
import { exportToCSV } from "@/lib/csvExport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";

export default function AdminCustomers() {
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const seedTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-templates/seed");
      if (!res.ok) {
        throw new Error("Failed to seed templates");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Templates loaded!",
        description: `${data.count} email templates are now available to use.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to load templates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/customers"] });
      setCreateDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "" });
      toast({
        title: "Customer created",
        description: "New customer has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update customer");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/customers"] });
      setEditDialogOpen(false);
      setSelectedCustomer(null);
      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete customer");
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/customers"] });
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      toast({
        title: "Customer deleted",
        description: "Customer has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { customerIds: string[]; subject: string; message: string }) => {
      const res = await apiRequest("POST", "/api/customers/send-email", data);
      if (!res.ok) {
        try {
          const error = await res.json();
          throw new Error(error.error || "Failed to send emails");
        } catch (e) {
          throw new Error("Failed to send emails");
        }
      }
      try {
        return await res.json();
      } catch (e) {
        throw new Error("Invalid response from server");
      }
    },
    onSuccess: (data: any) => {
      const { sent, skipped } = data;
      let description = `Email sent to ${sent} customer(s)`;
      if (skipped > 0) {
        description += `. ${skipped} customer(s) skipped (no email address)`;
      }
      toast({ 
        title: "Emails sent successfully",
        description 
      });
      setIsEmailDialogOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setSelectedCustomers(new Set());
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to send emails", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleCreate = () => {
    setFormData({ name: "", email: "", phone: "", address: "" });
    setCreateDialogOpen(true);
  };

  const submitCreate = () => {
    createMutation.mutate(formData);
  };

  const submitUpdate = () => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formData });
    }
  };

  const confirmDelete = () => {
    if (selectedCustomer) {
      deleteMutation.mutate(selectedCustomer.id);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "none") {
      setEmailSubject("");
      setEmailMessage("");
      return;
    }
    
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailMessage(template.body);
    }
  };

  const handleSendEmail = () => {
    if (selectedCustomers.size === 0) {
      toast({ title: "Please select at least one customer", variant: "destructive" });
      return;
    }
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({ title: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    sendEmailMutation.mutate({
      customerIds: Array.from(selectedCustomers),
      subject: emailSubject,
      message: emailMessage,
    });
  };

  const handleExportCSV = () => {
    exportToCSV({
      filename: `customers-${format(new Date(), 'yyyy-MM-dd')}`,
      data: filteredCustomers,
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email', format: (v) => v || '' },
        { key: 'phone', header: 'Phone', format: (v) => v || '' },
        { key: 'address', header: 'Address', format: (v) => v || '' },
        { key: 'totalBookings', header: 'Total Bookings', format: (v) => v || '0' },
        { key: 'totalQuotes', header: 'Total Quotes', format: (v) => v || '0' },
        { key: 'totalInvoices', header: 'Total Invoices', format: (v) => v || '0' },
        { 
          key: 'createdAt', 
          header: 'Created Date', 
          format: (v) => v ? format(new Date(v), 'yyyy-MM-dd') : '' 
        },
      ],
    });
    toast({
      title: "CSV Exported",
      description: `Exported ${filteredCustomers.length} customer(s) to CSV.`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Customers
          </h1>
          <div className="flex gap-2">
            <Button 
              onClick={handleExportCSV} 
              variant="outline"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleCreate} data-testid="button-create-customer">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {selectedCustomers.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsEmailDialogOpen(true)}
              data-testid="button-send-email"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email ({selectedCustomers.size} selected)
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedCustomers(new Set())}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-customers"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground" data-testid="text-no-customers">
                {searchQuery ? "No customers match your search." : "No customers found. Add your first customer to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCustomers.size === filteredCustomers.length}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Quotes</TableHead>
                        <TableHead>Invoices</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={() => toggleCustomerSelection(customer.id)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                        {customer.name}
                      </TableCell>
                      <TableCell data-testid={`text-customer-email-${customer.id}`}>
                        {customer.email || "—"}
                      </TableCell>
                      <TableCell data-testid={`text-customer-phone-${customer.id}`}>
                        {customer.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-bookings-${customer.id}`}>
                          {customer.totalBookings || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-quotes-${customer.id}`}>
                          {customer.totalQuotes || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-invoices-${customer.id}`}>
                          {customer.totalInvoices || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            data-testid={`button-view-${customer.id}`}
                          >
                            <Link href={`/admin/customers/${encodeURIComponent(customer.email)}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                            data-testid={`button-edit-${customer.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer)}
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent data-testid="dialog-view-customer">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View customer information and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium" data-testid="view-customer-name">{selectedCustomer.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p data-testid="view-customer-email">{selectedCustomer.email || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p data-testid="view-customer-phone">{selectedCustomer.phone || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p data-testid="view-customer-address">{selectedCustomer.address || "—"}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Total Bookings</Label>
                  <p className="text-2xl font-bold" data-testid="view-customer-bookings">{selectedCustomer.totalBookings || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Quotes</Label>
                  <p className="text-2xl font-bold" data-testid="view-customer-quotes">{selectedCustomer.totalQuotes || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Invoices</Label>
                  <p className="text-2xl font-bold" data-testid="view-customer-invoices">{selectedCustomer.totalInvoices || 0}</p>
                </div>
              </div>
              {selectedCustomer.createdAt && (
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Customer Since</Label>
                  <p data-testid="view-customer-since">{format(new Date(selectedCustomer.createdAt), "MMMM dd, yyyy")}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open && createDialogOpen);
        setEditDialogOpen(open && editDialogOpen);
      }}>
        <DialogContent data-testid="dialog-customer-form">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? "Edit Customer" : "Add New Customer"}</DialogTitle>
            <DialogDescription>
              {editDialogOpen ? "Update customer information" : "Add a new customer to your database"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                data-testid="input-customer-email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-customer-phone"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, Oklahoma City, OK"
                data-testid="input-customer-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
              }}
              data-testid="button-cancel-customer"
            >
              Cancel
            </Button>
            <Button
              onClick={editDialogOpen ? submitUpdate : submitCreate}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-customer"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCustomer?.name}? This will remove the customer record but not their associated bookings, quotes, or invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to Customers</DialogTitle>
            <DialogDescription>
              Compose an email to send to {selectedCustomers.size} selected customer{selectedCustomers.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Template (Optional)</label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger data-testid="select-email-template">
                  <SelectValue placeholder="Start from scratch or choose a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template - Start from scratch</SelectItem>
                  {emailTemplates.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seedTemplatesMutation.mutate()}
                        disabled={seedTemplatesMutation.isPending}
                        data-testid="button-load-templates"
                      >
                        {seedTemplatesMutation.isPending ? "Loading..." : "Load Templates"}
                      </Button>
                    </div>
                  )}
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {emailTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Load Templates" to access pre-made email templates
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Your message to customers..."
                rows={6}
                data-testid="textarea-email-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEmailDialogOpen(false)}
              data-testid="button-cancel-email"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending}
              data-testid="button-confirm-send-email"
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
