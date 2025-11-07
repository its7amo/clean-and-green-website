import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BusinessSettings } from "@shared/schema";
import { Loader2, Mail, Bell, RefreshCw, Star } from "lucide-react";
import { useEffect } from "react";

const emailSettingsSchema = z.object({
  reviewEmailEnabled: z.boolean(),
  followUpEmailEnabled: z.boolean(),
  reminderEmailEnabled: z.boolean(),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

export default function AdminAutomatedEmails() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      reviewEmailEnabled: true,
      followUpEmailEnabled: true,
      reminderEmailEnabled: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        reviewEmailEnabled: settings.reviewEmailEnabled ?? true,
        followUpEmailEnabled: settings.followUpEmailEnabled ?? true,
        reminderEmailEnabled: settings.reminderEmailEnabled ?? true,
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormValues) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Email automation settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automated Emails</h1>
          <p className="text-muted-foreground mt-2">
            Manage your automated email campaigns and view email templates
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Settings
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              Email Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Email Automation Controls</CardTitle>
                <CardDescription>
                  Turn automated emails on or off for your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="reviewEmailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-primary" />
                                <FormLabel className="text-base">
                                  Review Request Emails
                                </FormLabel>
                              </div>
                              <FormDescription>
                                Sent 24 hours after service completion - asks customers to leave a review
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-review-email"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="followUpEmailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-primary" />
                                <FormLabel className="text-base">
                                  Follow-Up Emails (30-Day)
                                </FormLabel>
                              </div>
                              <FormDescription>
                                Sent 30 days after service - encourages customers to book again
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-followup-email"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reminderEmailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                <FormLabel className="text-base">
                                  Appointment Reminders
                                </FormLabel>
                              </div>
                              <FormDescription>
                                Sent 24 hours before scheduled appointment - reduces no-shows
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-reminder-email"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending}
                          data-testid="button-save-email-settings"
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Settings"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <CardTitle>Review Request Email</CardTitle>
                </div>
                <CardDescription>Sent 24 hours after service completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Subject Line:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">[Customer Name], How was your cleaning experience? ⭐</code>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Email Preview:</p>
                  <div className="bg-muted p-4 rounded-md space-y-3 text-sm">
                    <p><strong>Hi [Customer Name]!</strong></p>
                    <p>Thank you for choosing Clean & Green for your [Service Type]!</p>
                    <p>We'd love to hear about your experience. Your feedback helps us improve and lets others know about our eco-friendly cleaning services.</p>
                    <p><strong>📝 Leave a Review</strong> [Button]</p>
                    <p className="text-xs text-muted-foreground">Includes link to reviews page</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <CardTitle>Follow-Up Email (30-Day)</CardTitle>
                </div>
                <CardDescription>Sent 30 days after service completion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Subject Line:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">[Customer Name], Ready for Another Cleaning? 🏡</code>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Email Preview:</p>
                  <div className="bg-muted p-4 rounded-md space-y-3 text-sm">
                    <p><strong>Hi [Customer Name]!</strong></p>
                    <p>It's been 30 days since we cleaned your home, and we wanted to check in. Your space is probably ready for another refresh!</p>
                    <p><strong>We'd love to help you maintain that clean, fresh feeling.</strong></p>
                    <p>As a returning customer, you're always our top priority. Book your next service today and experience:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>✨ The same eco-friendly products you loved</li>
                      <li>🏡 Professional deep cleaning service</li>
                      <li>💚 100% satisfaction guaranteed</li>
                    </ul>
                    <p><strong>📅 Book Your Next Cleaning</strong> [Button]</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Appointment Reminder</CardTitle>
                </div>
                <CardDescription>Sent 24 hours before scheduled appointment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Subject Line:</p>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">Reminder: Your cleaning appointment tomorrow ⏰</code>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Email Preview:</p>
                  <div className="bg-muted p-4 rounded-md space-y-3 text-sm">
                    <p><strong>Hi [Customer Name]!</strong></p>
                    <p>This is a friendly reminder that your [Service Type] is scheduled for tomorrow:</p>
                    <div className="bg-background p-3 rounded border">
                      <p><strong>Date:</strong> [Appointment Date]</p>
                      <p><strong>Time:</strong> [Time Slot]</p>
                      <p><strong>Address:</strong> [Customer Address]</p>
                    </div>
                    <p>Our team will arrive on time with all eco-friendly cleaning supplies. Please ensure someone is available to let us in.</p>
                    <p className="text-xs text-muted-foreground">Also sent as SMS to customer's phone</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
