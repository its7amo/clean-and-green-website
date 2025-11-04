import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FaqItem } from "@shared/schema";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const faqFormSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  order: z.number().min(0, "Order must be positive"),
  active: z.boolean().default(true),
});

type FaqFormValues = z.infer<typeof faqFormSchema>;

export default function AdminFaq() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const { data: faqItems = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ["/api/admin/faq"],
  });

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      order: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (editingFaq) {
      form.reset({
        question: editingFaq.question,
        answer: editingFaq.answer,
        order: editingFaq.order,
        active: editingFaq.active,
      });
    } else {
      form.reset({
        question: "",
        answer: "",
        order: 0,
        active: true,
      });
    }
  }, [editingFaq, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FaqFormValues) => {
      const res = await apiRequest("POST", "/api/faq", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
      setIsDialogOpen(false);
      setEditingFaq(null);
      form.reset();
      toast({
        title: "FAQ created",
        description: "FAQ item has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create FAQ",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FaqFormValues }) => {
      const res = await apiRequest("PATCH", `/api/faq/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
      setIsDialogOpen(false);
      setEditingFaq(null);
      form.reset();
      toast({
        title: "FAQ updated",
        description: "FAQ item has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update FAQ",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/faq/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
      toast({
        title: "FAQ deleted",
        description: "FAQ item has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete FAQ",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FaqFormValues) => {
    if (editingFaq) {
      updateMutation.mutate({ id: editingFaq.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this FAQ item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingFaq(null);
      form.reset();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          FAQ Management
        </h1>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Manage FAQ Items</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-faq">
                    <Plus className="mr-2 h-4 w-4" />
                    Add FAQ
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingFaq ? "Edit FAQ Item" : "Add New FAQ Item"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingFaq
                        ? "Update the FAQ item details below."
                        : "Create a new FAQ item for your customers."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="question"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-faq-question"
                                placeholder="What services do you offer?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="answer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Answer</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-faq-answer"
                                placeholder="Provide a detailed answer..."
                                className="min-h-32"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Order</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                data-testid="input-faq-order"
                                placeholder="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="input-faq-active"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Active</FormLabel>
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
                          data-testid="button-submit-faq"
                        >
                          {(createMutation.isPending || updateMutation.isPending) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingFaq ? "Update" : "Create"
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
              ) : faqItems.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground" data-testid="text-no-faqs">
                  No FAQ items found. Add your first FAQ to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqItems.map((faq) => (
                      <TableRow key={faq.id} data-testid={`row-faq-${faq.id}`}>
                        <TableCell className="font-medium max-w-xs" data-testid={`text-faq-question-${faq.id}`}>
                          {faq.question}
                        </TableCell>
                        <TableCell className="max-w-md truncate" data-testid={`text-faq-answer-${faq.id}`}>
                          {faq.answer}
                        </TableCell>
                        <TableCell data-testid={`text-faq-order-${faq.id}`}>
                          {faq.order}
                        </TableCell>
                        <TableCell>
                          {faq.active ? (
                            <Badge variant="default" data-testid={`badge-active-${faq.id}`}>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-inactive-${faq.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(faq)}
                              data-testid={`button-edit-${faq.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(faq.id)}
                              data-testid={`button-delete-${faq.id}`}
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
