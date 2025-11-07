import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  reviewEmailSubject: z.string().optional(),
  reviewEmailBody: z.string().optional(),
  followUpEmailSubject: z.string().optional(),
  followUpEmailBody: z.string().optional(),
  reminderEmailSubject: z.string().optional(),
  reminderEmailBody: z.string().optional(),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

// Default email templates
const DEFAULT_REVIEW_SUBJECT = "{{customerName}}, How was your cleaning experience? ⭐";
const DEFAULT_REVIEW_BODY = `Hi {{customerName}}!

Thank you for choosing Clean & Green for your {{serviceType}}!

We'd love to hear about your experience. Your feedback helps us improve and lets others know about our eco-friendly cleaning services.

Please take a moment to leave us a review and let us know how we did!

Best regards,
Clean & Green Team`;

const DEFAULT_FOLLOWUP_SUBJECT = "{{customerName}}, Ready for Another Cleaning? 🏡";
const DEFAULT_FOLLOWUP_BODY = `Hi {{customerName}}!

It's been 30 days since we cleaned your home, and we wanted to check in. Your space is probably ready for another refresh!

We'd love to help you maintain that clean, fresh feeling.

As a returning customer, you're always our top priority. Book your next service today and experience:

✨ The same eco-friendly products you loved
🏡 Professional deep cleaning service
💚 100% satisfaction guaranteed

Ready to book? Click here to schedule your next appointment!

Best regards,
Clean & Green Team`;

const DEFAULT_REMINDER_SUBJECT = "Reminder: Your cleaning appointment tomorrow ⏰";
const DEFAULT_REMINDER_BODY = `Hi {{customerName}}!

This is a friendly reminder that your {{serviceType}} is scheduled for tomorrow:

Date: {{appointmentDate}}
Time: {{timeSlot}}
Address: {{customerAddress}}

Our team will arrive on time with all eco-friendly cleaning supplies. Please ensure someone is available to let us in.

If you need to reschedule, please contact us as soon as possible.

Looking forward to seeing you tomorrow!

Best regards,
Clean & Green Team`;

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
      reviewEmailSubject: "",
      reviewEmailBody: "",
      followUpEmailSubject: "",
      followUpEmailBody: "",
      reminderEmailSubject: "",
      reminderEmailBody: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        reviewEmailEnabled: settings.reviewEmailEnabled ?? true,
        followUpEmailEnabled: settings.followUpEmailEnabled ?? true,
        reminderEmailEnabled: settings.reminderEmailEnabled ?? true,
        reviewEmailSubject: settings.reviewEmailSubject || "",
        reviewEmailBody: settings.reviewEmailBody || "",
        followUpEmailSubject: settings.followUpEmailSubject || "",
        followUpEmailBody: settings.followUpEmailBody || "",
        reminderEmailSubject: settings.reminderEmailSubject || "",
        reminderEmailBody: settings.reminderEmailBody || "",
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormValues) => {
      // Merge email settings with existing business settings to avoid validation errors
      const mergedData = {
        ...settings, // Include all existing settings
        ...data,     // Override with email template changes
      };
      const res = await apiRequest("POST", "/api/settings", mergedData);
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        <CardTitle>Review Request Email</CardTitle>
                      </div>
                      <CardDescription>
                        Sent 24 hours after service completion. Use {`{{customerName}}`} and {`{{serviceType}}`} as placeholders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="reviewEmailSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_REVIEW_SUBJECT}
                                data-testid="input-review-subject"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reviewEmailBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_REVIEW_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-review-body"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        <CardTitle>Follow-Up Email (30-Day)</CardTitle>
                      </div>
                      <CardDescription>
                        Sent 30 days after service completion. Use {`{{customerName}}`} as a placeholder.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="followUpEmailSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_FOLLOWUP_SUBJECT}
                                data-testid="input-followup-subject"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="followUpEmailBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_FOLLOWUP_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-followup-body"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <CardTitle>Appointment Reminder</CardTitle>
                      </div>
                      <CardDescription>
                        Sent 24 hours before appointment. Use {`{{customerName}}`}, {`{{serviceType}}`}, {`{{appointmentDate}}`}, {`{{timeSlot}}`}, {`{{customerAddress}}`} as placeholders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="reminderEmailSubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_REMINDER_SUBJECT}
                                data-testid="input-reminder-subject"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reminderEmailBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_REMINDER_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-reminder-body"
                              />
                            </FormControl>
                            <FormDescription>
                              Leave empty to use default template. Also sent as SMS.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-save-templates"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save All Templates"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
