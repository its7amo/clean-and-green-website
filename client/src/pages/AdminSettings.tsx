import { useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BusinessSettings } from "@shared/schema";
import { Loader2 } from "lucide-react";

const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  tagline: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  logoUrl: z.string().url("Invalid URL").or(z.literal("")).optional(),
  hoursMonFri: z.string().min(1, "Monday-Friday hours are required"),
  hoursSat: z.string().optional(),
  hoursSun: z.string().optional(),
  aboutText: z.string().optional(),
  serviceAreas: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  privacyPolicy: z.string().optional(),
  termsOfService: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  promoBannerEnabled: z.boolean(),
  promoBannerMessage: z.string().optional(),
  statsCounterEnabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: "",
      tagline: "",
      phone: "",
      email: "",
      address: "",
      logoUrl: "",
      hoursMonFri: "",
      hoursSat: "",
      hoursSun: "",
      aboutText: "",
      serviceAreas: "",
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      privacyPolicy: "",
      termsOfService: "",
      cancellationPolicy: "",
      promoBannerEnabled: true,
      promoBannerMessage: "",
      statsCounterEnabled: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName || "",
        tagline: settings.tagline || "",
        phone: settings.phone || "",
        email: settings.email || "",
        address: settings.address || "",
        logoUrl: settings.logoUrl || "",
        hoursMonFri: settings.hoursMonFri || "",
        hoursSat: settings.hoursSat || "",
        hoursSun: settings.hoursSun || "",
        aboutText: settings.aboutText || "",
        serviceAreas: settings.serviceAreas?.join("\n") || "",
        facebook: settings.socialLinks?.facebook || "",
        instagram: settings.socialLinks?.instagram || "",
        twitter: settings.socialLinks?.twitter || "",
        linkedin: settings.socialLinks?.linkedin || "",
        privacyPolicy: settings.privacyPolicy || "",
        termsOfService: settings.termsOfService || "",
        cancellationPolicy: settings.cancellationPolicy || "",
        promoBannerEnabled: settings.promoBannerEnabled ?? true,
        promoBannerMessage: settings.promoBannerMessage || "",
        statsCounterEnabled: settings.statsCounterEnabled ?? true,
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const serviceAreasArray = data.serviceAreas
        ? data.serviceAreas.split("\n").map(s => s.trim()).filter(Boolean)
        : [];
      
      const payload = {
        ...data,
        serviceAreas: serviceAreasArray,
        socialLinks: {
          facebook: data.facebook || undefined,
          instagram: data.instagram || undefined,
          twitter: data.twitter || undefined,
          linkedin: data.linkedin || undefined,
        },
      };
      
      // Remove the individual social fields before sending
      const { facebook, instagram, twitter, linkedin, ...rest } = payload;
      
      const res = await apiRequest("POST", "/api/settings", rest);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Business settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Business Settings
        </h1>
        <Card>
            <CardHeader>
              <CardTitle>Update Business Information</CardTitle>
              <CardDescription>
                Manage your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-business-name"
                                placeholder="Clean & Green"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tagline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tagline</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-tagline"
                                placeholder="Eco-friendly cleaning services"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-phone"
                                placeholder="(405) 555-0123"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                data-testid="input-email"
                                placeholder="info@cleanandgreen.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-address"
                              placeholder="123 Main Street, Oklahoma City, OK 73102"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL (optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-logo-url"
                              placeholder="https://example.com/logo.png"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="hoursMonFri"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours (Mon-Fri)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-hours-mon-fri"
                                placeholder="8:00 AM - 6:00 PM"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hoursSat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours (Saturday)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-hours-sat"
                                placeholder="9:00 AM - 4:00 PM"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hoursSun"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours (Sunday)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-hours-sun"
                                placeholder="Closed"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="aboutText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About Text</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="input-about-text"
                              placeholder="Tell customers about your business..."
                              className="min-h-32"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serviceAreas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Areas</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="input-service-areas"
                              placeholder="Enter one service area per line, e.g.&#10;Oklahoma City&#10;Norman&#10;Edmond"
                              rows={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Social Media Links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="facebook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Facebook URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-facebook"
                                  placeholder="https://facebook.com/cleanandgreen"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-instagram"
                                  placeholder="https://instagram.com/cleanandgreen"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="twitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter/X URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-twitter"
                                  placeholder="https://twitter.com/cleanandgreen"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="linkedin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-linkedin"
                                  placeholder="https://linkedin.com/company/cleanandgreen"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Promo Banner Settings</h3>
                      <FormField
                        control={form.control}
                        name="promoBannerEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Enable Promo Banner
                              </FormLabel>
                              <FormDescription>
                                Show active promo codes on the homepage
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-promo-banner"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="promoBannerMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Banner Message (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-banner-message"
                                placeholder="Leave empty to use auto-generated message from promo code"
                              />
                            </FormControl>
                            <FormDescription>
                              Override the default banner text. Leave blank to show promo code details automatically.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="statsCounterEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Enable Stats Counter
                              </FormLabel>
                              <FormDescription>
                                Show animated stats on homepage (homes cleaned, ratings). Turn off when starting out.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-stats-counter"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Legal Pages</h3>
                      <FormField
                        control={form.control}
                        name="privacyPolicy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Privacy Policy</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-privacy-policy"
                                placeholder="Enter your privacy policy content..."
                                className="min-h-64"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="termsOfService"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terms of Service</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-terms-of-service"
                                placeholder="Enter your terms of service content..."
                                className="min-h-64"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cancellationPolicy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cancellation Policy</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-cancellation-policy"
                                placeholder="Enter your cancellation policy (e.g., Cancellations made less than 24 hours before the scheduled appointment time will incur a $35 cancellation fee.)"
                                className="min-h-64"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        data-testid="button-save-settings"
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
      </div>
    </AdminLayout>
  );
}
