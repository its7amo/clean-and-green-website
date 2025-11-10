import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Loader2, Save, FileText } from "lucide-react";
import type { CmsContent } from "@shared/schema";

export default function AdminCMS() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home_hero");

  const { data: cmsContent = [], isLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content"],
  });

  // Group content by section
  const contentBySection: Record<string, Record<string, string>> = {};
  cmsContent.forEach((item) => {
    if (!contentBySection[item.section]) {
      contentBySection[item.section] = {};
    }
    contentBySection[item.section][item.key] = item.value;
  });

  const updateContentMutation = useMutation({
    mutationFn: async ({ section, updates }: { section: string; updates: Record<string, string> }) => {
      const res = await apiRequest("POST", `/api/cms/content/${section}/batch`, updates);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update content");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({
        title: "Content Updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const SectionEditor = ({ section, title, description, fields }: {
    section: string;
    title: string;
    description: string;
    fields: { key: string; label: string; type?: "text" | "textarea" | "url"; placeholder?: string }[];
  }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});

    // Update form data when content loads or section changes
    useEffect(() => {
      setFormData(contentBySection[section] || {});
    }, [section, JSON.stringify(contentBySection[section])]);

    const handleSave = () => {
      updateContentMutation.mutate({ section, updates: formData });
    };

    const isModified = JSON.stringify(formData) !== JSON.stringify(contentBySection[section] || {});

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`${section}-${field.key}`}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`${section}-${field.key}`}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={6}
                  data-testid={`textarea-${section}-${field.key}`}
                />
              ) : (
                <Input
                  id={`${section}-${field.key}`}
                  type={field.type === "url" ? "url" : "text"}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  data-testid={`input-${section}-${field.key}`}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isModified || updateContentMutation.isPending}
              data-testid={`button-save-${section}`}
            >
              {updateContentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Editor</h1>
          <p className="text-muted-foreground mt-2">
            Manage all customer-facing content on your website. Changes appear immediately.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="home_hero" data-testid="tab-home-hero">Homepage Hero</TabsTrigger>
            <TabsTrigger value="home_welcome" data-testid="tab-home-welcome">Homepage Welcome</TabsTrigger>
            <TabsTrigger value="about_page" data-testid="tab-about">About Page</TabsTrigger>
            <TabsTrigger value="services_intro" data-testid="tab-services">Services Intro</TabsTrigger>
            <TabsTrigger value="contact_page" data-testid="tab-contact">Contact Page</TabsTrigger>
            <TabsTrigger value="footer" data-testid="tab-footer">Footer</TabsTrigger>
          </TabsList>

          <TabsContent value="home_hero" className="space-y-4">
            <SectionEditor
              section="home_hero"
              title="Homepage Hero Section"
              description="The main banner at the top of your homepage"
              fields={[
                { key: "title", label: "Hero Title", type: "text", placeholder: "Professional Eco-Friendly Cleaning Services" },
                { key: "subtitle", label: "Hero Subtitle", type: "text", placeholder: "Green cleaning solutions for your home and business" },
                { key: "cta_text", label: "Button Text", type: "text", placeholder: "Book a Cleaning" },
                { key: "cta_link", label: "Button Link", type: "text", placeholder: "/booking" },
                { key: "image_url", label: "Hero Image URL", type: "url", placeholder: "https://example.com/hero.jpg" },
              ]}
            />
          </TabsContent>

          <TabsContent value="home_welcome" className="space-y-4">
            <SectionEditor
              section="home_welcome"
              title="Homepage Welcome Section"
              description="The welcome message shown below the hero"
              fields={[
                { key: "title", label: "Welcome Title", type: "text", placeholder: "Welcome to Clean & Green" },
                { key: "description", label: "Welcome Description", type: "textarea", placeholder: "We provide professional cleaning services..." },
              ]}
            />
          </TabsContent>

          <TabsContent value="about_page" className="space-y-4">
            <SectionEditor
              section="about_page"
              title="About Page Content"
              description="Tell customers about your business"
              fields={[
                { key: "title", label: "Page Title", type: "text", placeholder: "About Clean & Green" },
                { key: "description", label: "About Description", type: "textarea", placeholder: "Clean & Green is Oklahoma's premier..." },
                { key: "mission_title", label: "Mission Title", type: "text", placeholder: "Our Mission" },
                { key: "mission_text", label: "Mission Statement", type: "textarea", placeholder: "To provide exceptional cleaning services..." },
                { key: "team_image_url", label: "Team Photo URL", type: "url", placeholder: "https://example.com/team.jpg" },
              ]}
            />
          </TabsContent>

          <TabsContent value="services_intro" className="space-y-4">
            <SectionEditor
              section="services_intro"
              title="Services Introduction"
              description="Text shown above your service list"
              fields={[
                { key: "title", label: "Services Title", type: "text", placeholder: "Our Cleaning Services" },
                { key: "description", label: "Services Description", type: "textarea", placeholder: "Choose from our range of professional cleaning services..." },
              ]}
            />
          </TabsContent>

          <TabsContent value="contact_page" className="space-y-4">
            <SectionEditor
              section="contact_page"
              title="Contact Page Content"
              description="Content shown on the contact page"
              fields={[
                { key: "title", label: "Contact Title", type: "text", placeholder: "Get in Touch" },
                { key: "description", label: "Contact Description", type: "textarea", placeholder: "Have questions or ready to book?" },
              ]}
            />
          </TabsContent>

          <TabsContent value="footer" className="space-y-4">
            <SectionEditor
              section="footer"
              title="Footer Content"
              description="Content shown at the bottom of every page"
              fields={[
                { key: "tagline", label: "Footer Tagline", type: "text", placeholder: "Professional eco-friendly cleaning services in Oklahoma" },
                { key: "copyright", label: "Copyright Text", type: "text", placeholder: "© 2024 Clean & Green. All rights reserved." },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
