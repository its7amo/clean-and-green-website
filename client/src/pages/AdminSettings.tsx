import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminSettings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, authLoading]);

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
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
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const res = await apiRequest("POST", "/api/settings", data);
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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Business Settings
            </h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="p-8">
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
        </main>
      </div>
    </div>
  );
}
