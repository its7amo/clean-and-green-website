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
import { Loader2, Mail, Bell, RefreshCw, Star, DollarSign } from "lucide-react";
import { useEffect } from "react";

const emailSettingsSchema = z.object({
  reviewEmailEnabled: z.boolean(),
  followUpEmailEnabled: z.boolean(),
  reminderEmailEnabled: z.boolean(),
  paymentReminderEnabled: z.boolean(),
  reviewEmailSubject: z.string().optional(),
  reviewEmailBody: z.string().optional(),
  followUpEmailSubject: z.string().optional(),
  followUpEmailBody: z.string().optional(),
  reminderEmailSubject: z.string().optional(),
  reminderEmailBody: z.string().optional(),
  paymentReminder3DaySubject: z.string().optional(),
  paymentReminder3DayBody: z.string().optional(),
  paymentReminder7DaySubject: z.string().optional(),
  paymentReminder7DayBody: z.string().optional(),
  paymentReminder14DaySubject: z.string().optional(),
  paymentReminder14DayBody: z.string().optional(),
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

const DEFAULT_PAYMENT_3DAY_SUBJECT = "Friendly Reminder: Invoice {{invoiceNumber}} is overdue";
const DEFAULT_PAYMENT_3DAY_BODY = 'Hi {{customerName}},\n\n' +
  'We hope you\'re enjoying your freshly cleaned space!\n\n' +
  'This is a friendly reminder that invoice {{invoiceNumber}} for ${{amountDue}} is now {{daysOverdue}} days overdue.\n\n' +
  'We understand that things can slip through the cracks. If you\'ve already sent payment, please disregard this message.\n\n' +
  'You can easily pay your invoice online here: {{paymentLink}}\n\n' +
  'If you have any questions about your invoice or need to discuss payment options, please don\'t hesitate to reach out.\n\n' +
  'Thank you for choosing Clean & Green!\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

const DEFAULT_PAYMENT_7DAY_SUBJECT = "Important: Invoice {{invoiceNumber}} - Payment Required";
const DEFAULT_PAYMENT_7DAY_BODY = 'Hi {{customerName}},\n\n' +
  'This is an important notice regarding invoice {{invoiceNumber}} for ${{amountDue}}, which is now {{daysOverdue}} days overdue.\n\n' +
  'We value your business and want to help resolve this matter quickly.\n\n' +
  'Please submit payment at your earliest convenience: {{paymentLink}}\n\n' +
  'If you\'re experiencing any issues or need to arrange a payment plan, please contact us immediately. We\'re here to work with you.\n\n' +
  'Thank you for your prompt attention to this matter.\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

const DEFAULT_PAYMENT_14DAY_SUBJECT = "URGENT: Invoice {{invoiceNumber}} - Immediate Payment Required";
const DEFAULT_PAYMENT_14DAY_BODY = 'Hi {{customerName}},\n\n' +
  'This is an urgent notice regarding invoice {{invoiceNumber}} for ${{amountDue}}, which is now {{daysOverdue}} days overdue.\n\n' +
  'We have made several attempts to reach you regarding this outstanding balance. Immediate payment is required to avoid further action.\n\n' +
  'Pay now: {{paymentLink}}\n\n' +
  'If payment is not received within the next 48 hours, we may need to suspend services and take additional collection measures.\n\n' +
  'Please contact us immediately if there are extenuating circumstances we should be aware of. We prefer to resolve this amicably.\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

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
      paymentReminderEnabled: true,
      reviewEmailSubject: "",
      reviewEmailBody: "",
      followUpEmailSubject: "",
      followUpEmailBody: "",
      reminderEmailSubject: "",
      reminderEmailBody: "",
      paymentReminder3DaySubject: "",
      paymentReminder3DayBody: "",
      paymentReminder7DaySubject: "",
      paymentReminder7DayBody: "",
      paymentReminder14DaySubject: "",
      paymentReminder14DayBody: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        reviewEmailEnabled: settings.reviewEmailEnabled ?? true,
        followUpEmailEnabled: settings.followUpEmailEnabled ?? true,
        reminderEmailEnabled: settings.reminderEmailEnabled ?? true,
        paymentReminderEnabled: settings.paymentReminderEnabled ?? true,
        reviewEmailSubject: settings.reviewEmailSubject || "",
        reviewEmailBody: settings.reviewEmailBody || "",
        followUpEmailSubject: settings.followUpEmailSubject || "",
        followUpEmailBody: settings.followUpEmailBody || "",
        reminderEmailSubject: settings.reminderEmailSubject || "",
        reminderEmailBody: settings.reminderEmailBody || "",
        paymentReminder3DaySubject: settings.paymentReminder3DaySubject || "",
        paymentReminder3DayBody: settings.paymentReminder3DayBody || "",
        paymentReminder7DaySubject: settings.paymentReminder7DaySubject || "",
        paymentReminder7DayBody: settings.paymentReminder7DayBody || "",
        paymentReminder14DaySubject: settings.paymentReminder14DaySubject || "",
        paymentReminder14DayBody: settings.paymentReminder14DayBody || "",
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

                      <FormField
                        control={form.control}
                        name="paymentReminderEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                <FormLabel className="text-base">
                                  Payment Reminders
                                </FormLabel>
                              </div>
                              <FormDescription>
                                Automatically sends escalating reminders for overdue invoices at 3, 7, and 14 days
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-payment-reminder"
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

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <CardTitle>3-Day Overdue Reminder</CardTitle>
                      </div>
                      <CardDescription>
                        Sent when invoice is 3 days overdue. Use {`{{customerName}}`}, {`{{invoiceNumber}}`}, {`{{amountDue}}`}, {`{{daysOverdue}}`}, {`{{paymentLink}}`} as placeholders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paymentReminder3DaySubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_PAYMENT_3DAY_SUBJECT}
                                data-testid="input-payment-3day-subject"
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
                        name="paymentReminder3DayBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_PAYMENT_3DAY_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-payment-3day-body"
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
                        <DollarSign className="h-5 w-5 text-primary" />
                        <CardTitle>7-Day Overdue Reminder</CardTitle>
                      </div>
                      <CardDescription>
                        Sent when invoice is 7 days overdue. Use {`{{customerName}}`}, {`{{invoiceNumber}}`}, {`{{amountDue}}`}, {`{{daysOverdue}}`}, {`{{paymentLink}}`} as placeholders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paymentReminder7DaySubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_PAYMENT_7DAY_SUBJECT}
                                data-testid="input-payment-7day-subject"
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
                        name="paymentReminder7DayBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_PAYMENT_7DAY_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-payment-7day-body"
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
                        <DollarSign className="h-5 w-5 text-primary" />
                        <CardTitle>14-Day Overdue Reminder</CardTitle>
                      </div>
                      <CardDescription>
                        Sent when invoice is 14 days overdue. Use {`{{customerName}}`}, {`{{invoiceNumber}}`}, {`{{amountDue}}`}, {`{{daysOverdue}}`}, {`{{paymentLink}}`} as placeholders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paymentReminder14DaySubject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={DEFAULT_PAYMENT_14DAY_SUBJECT}
                                data-testid="input-payment-14day-subject"
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
                        name="paymentReminder14DayBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Body</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={DEFAULT_PAYMENT_14DAY_BODY}
                                className="min-h-64 font-mono text-sm"
                                data-testid="input-payment-14day-body"
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
