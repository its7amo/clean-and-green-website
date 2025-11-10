import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Loader2, Save, FileText, Image, Eye, EyeOff, Upload, X } from "lucide-react";
import type { CmsContent, CmsSection, CmsAsset } from "@shared/schema";

export default function AdminCMS() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home_hero");

  const { data: cmsContent = [], isLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content"],
  });

  const { data: cmsSections = [], isLoading: sectionsLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/cms/sections"],
  });

  // Fetch all assets from the centralized public endpoint
  const { data: allAssets = [], isLoading: assetsLoading } = useQuery<CmsAsset[]>({
    queryKey: ["/api/public/cms/assets"],
    staleTime: 30 * 1000,
  });

  // Group content by section
  const contentBySection: Record<string, Record<string, string>> = {};
  cmsContent.forEach((item) => {
    if (!contentBySection[item.section]) {
      contentBySection[item.section] = {};
    }
    contentBySection[item.section][item.key] = item.value;
  });

  // Group sections by name for visibility
  const sectionVisibility: Record<string, boolean> = {};
  cmsSections.forEach((section) => {
    sectionVisibility[section.section] = section.visible;
  });

  // Group assets by section and key
  const assetsBySection: Record<string, Record<string, CmsAsset>> = {};
  allAssets.forEach((asset) => {
    if (!assetsBySection[asset.section]) {
      assetsBySection[asset.section] = {};
    }
    assetsBySection[asset.section][asset.key] = asset;
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
      queryClient.invalidateQueries({ queryKey: ["/api/public/cms/content"] });
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

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ section, visible }: { section: string; visible: boolean }) => {
      const res = await apiRequest("PUT", `/api/cms/sections/${section}/visibility`, { visible });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update visibility");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/cms/sections"] });
      toast({
        title: "Visibility Updated",
        description: "Section visibility has been updated.",
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

  const uploadAssetMutation = useMutation({
    mutationFn: async ({ section, key, imageData, mimeType, originalName }: {
      section: string;
      key: string;
      imageData: string;
      mimeType: string;
      originalName?: string;
    }) => {
      const res = await apiRequest("POST", "/api/cms/assets", {
        section,
        key,
        imageData,
        mimeType,
        originalName,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.details || "Failed to upload image");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/cms/assets"] });
      toast({
        title: "Image Uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async ({ section, key }: { section: string; key: string }) => {
      const res = await apiRequest("DELETE", `/api/cms/assets/${section}/${key}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete image");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/cms/assets"] });
      toast({
        title: "Image Deleted",
        description: "Your image has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  interface SectionEditorProps {
    section: string;
    title: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      type?: "text" | "textarea" | "url" | "image" | "color";
      placeholder?: string;
      hint?: string;
    }>;
  }

  const SectionEditor = ({ section, title, description, fields }: SectionEditorProps) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const visible = sectionVisibility[section] ?? true;

    useEffect(() => {
      setFormData(contentBySection[section] || {});
    }, [section, JSON.stringify(contentBySection[section])]);

    // Load existing images from assets when component mounts or assets change
    useEffect(() => {
      const sectionAssets = assetsBySection[section] || {};
      const imageMap: Record<string, string> = {};
      Object.keys(sectionAssets).forEach((key) => {
        const assetKey = `${section}-${key}`; // Namespace by section and key
        imageMap[assetKey] = sectionAssets[key].imageData;
      });
      setUploadedImages(imageMap);
    }, [section, JSON.stringify(assetsBySection[section])]);

    const handleSave = () => {
      updateContentMutation.mutate({ section, updates: formData });
    };

    const handleVisibilityToggle = () => {
      updateVisibilityMutation.mutate({ section, visible: !visible });
    };

    const handleImageUpload = async (key: string, file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 500 * 1024) {
        toast({
          title: "File Too Large",
          description: "Images must be under 500KB. Please compress your image.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const assetKey = `${section}-${key}`; // Namespace by section and key
        setUploadedImages(prev => ({ ...prev, [assetKey]: imageData }));
        
        await uploadAssetMutation.mutateAsync({
          section,
          key,
          imageData,
          mimeType: file.type,
          originalName: file.name,
        });
      };
      reader.readAsDataURL(file);
    };

    const handleImageRemove = async (key: string) => {
      const assetKey = `${section}-${key}`; // Namespace by section and key
      
      // Delete from backend
      await deleteAssetMutation.mutateAsync({ section, key });
      
      // Clear local preview state
      setUploadedImages(prev => {
        const updated = { ...prev };
        delete updated[assetKey];
        return updated;
      });
    };

    const isModified = JSON.stringify(formData) !== JSON.stringify(contentBySection[section] || {});

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`visibility-${section}`} className="text-sm font-medium cursor-pointer">
                {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Label>
              <Switch
                id={`visibility-${section}`}
                checked={visible}
                onCheckedChange={handleVisibilityToggle}
                disabled={updateVisibilityMutation.isPending}
                data-testid={`switch-visibility-${section}`}
              />
              <span className="text-sm text-muted-foreground ml-1">
                {visible ? "Visible" : "Hidden"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`${section}-${field.key}`}>
                {field.label}
                {field.type === "image" && <span className="text-muted-foreground ml-1 text-xs">(Max 500KB)</span>}
              </Label>
              {field.hint && (
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              )}
              {field.type === "textarea" ? (
                <Textarea
                  id={`${section}-${field.key}`}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={6}
                  data-testid={`textarea-${section}-${field.key}`}
                />
              ) : field.type === "image" ? (
                <div className="space-y-3">
                  {uploadedImages[`${section}-${field.key}`] && (
                    <div className="relative inline-block">
                      <img
                        src={uploadedImages[`${section}-${field.key}`]}
                        alt={field.label}
                        className="max-w-md max-h-64 rounded-md border"
                        data-testid={`img-preview-${section}-${field.key}`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => handleImageRemove(field.key)}
                        disabled={deleteAssetMutation.isPending}
                        data-testid={`button-remove-${section}-${field.key}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id={`${section}-${field.key}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => (fileInputRefs.current[`${section}-${field.key}`] = el)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(field.key, file);
                      }}
                      data-testid={`input-file-${section}-${field.key}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.current[`${section}-${field.key}`]?.click()}
                      disabled={uploadAssetMutation.isPending}
                      data-testid={`button-upload-${section}-${field.key}`}
                    >
                      {uploadAssetMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadedImages[`${section}-${field.key}`] ? "Change Image" : "Upload Image"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : field.type === "color" ? (
                <div className="flex gap-2 items-center">
                  <Input
                    id={`${section}-${field.key}`}
                    type="color"
                    value={formData[field.key] || "#000000"}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-24 h-10"
                    data-testid={`input-color-${section}-${field.key}`}
                  />
                  <Input
                    type="text"
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || "#000000"}
                    className="flex-1"
                    data-testid={`input-${section}-${field.key}`}
                  />
                </div>
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

  if (isLoading || sectionsLoading || assetsLoading) {
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
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all customer-facing content, images, and section visibility. Changes appear immediately.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="home_hero" data-testid="tab-home-hero">Hero</TabsTrigger>
            <TabsTrigger value="home_welcome" data-testid="tab-home-welcome">Welcome</TabsTrigger>
            <TabsTrigger value="how_it_works" data-testid="tab-how-it-works">How It Works</TabsTrigger>
            <TabsTrigger value="services_intro" data-testid="tab-services">Services</TabsTrigger>
            <TabsTrigger value="cta_section" data-testid="tab-cta">Call to Action</TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="about_page" data-testid="tab-about">About</TabsTrigger>
            <TabsTrigger value="contact_page" data-testid="tab-contact">Contact</TabsTrigger>
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
                { key: "hero_image", label: "Hero Background Image", type: "image" },
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
                { key: "image", label: "Welcome Image", type: "image" },
              ]}
            />
          </TabsContent>

          <TabsContent value="how_it_works" className="space-y-4">
            <SectionEditor
              section="how_it_works"
              title="How It Works Section"
              description="Explain your service process to customers"
              fields={[
                { key: "title", label: "Section Title", type: "text", placeholder: "How It Works" },
                { key: "step1_title", label: "Step 1 Title", type: "text", placeholder: "Book Online" },
                { key: "step1_description", label: "Step 1 Description", type: "textarea", placeholder: "Choose your service and schedule..." },
                { key: "step2_title", label: "Step 2 Title", type: "text", placeholder: "We Clean" },
                { key: "step2_description", label: "Step 2 Description", type: "textarea", placeholder: "Our professional team arrives..." },
                { key: "step3_title", label: "Step 3 Title", type: "text", placeholder: "Enjoy a Clean Space" },
                { key: "step3_description", label: "Step 3 Description", type: "textarea", placeholder: "Relax in your sparkling clean space..." },
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

          <TabsContent value="cta_section" className="space-y-4">
            <SectionEditor
              section="cta_section"
              title="Call to Action Section"
              description="Encourage visitors to take action"
              fields={[
                { key: "title", label: "CTA Title", type: "text", placeholder: "Ready to Experience Clean?" },
                { key: "description", label: "CTA Description", type: "textarea", placeholder: "Book your first cleaning today and get 10% off..." },
                { key: "button_text", label: "Button Text", type: "text", placeholder: "Book Now" },
                { key: "button_link", label: "Button Link", type: "text", placeholder: "/booking" },
                { key: "background_color", label: "Background Color", type: "color", placeholder: "#10b981" },
              ]}
            />
          </TabsContent>

          <TabsContent value="testimonials" className="space-y-4">
            <SectionEditor
              section="testimonials"
              title="Testimonials Section"
              description="Display customer reviews and feedback"
              fields={[
                { key: "title", label: "Section Title", type: "text", placeholder: "What Our Customers Say" },
                { key: "testimonial1_text", label: "Testimonial 1 Text", type: "textarea", placeholder: "Clean & Green did an amazing job..." },
                { key: "testimonial1_author", label: "Testimonial 1 Author", type: "text", placeholder: "Sarah Johnson" },
                { key: "testimonial1_location", label: "Testimonial 1 Location", type: "text", placeholder: "Oklahoma City, OK" },
                { key: "testimonial2_text", label: "Testimonial 2 Text", type: "textarea", placeholder: "Professional and eco-friendly..." },
                { key: "testimonial2_author", label: "Testimonial 2 Author", type: "text", placeholder: "Mike Davis" },
                { key: "testimonial2_location", label: "Testimonial 2 Location", type: "text", placeholder: "Tulsa, OK" },
                { key: "testimonial3_text", label: "Testimonial 3 Text", type: "textarea", placeholder: "I love that they use green products..." },
                { key: "testimonial3_author", label: "Testimonial 3 Author", type: "text", placeholder: "Emily Chen" },
                { key: "testimonial3_location", label: "Testimonial 3 Location", type: "text", placeholder: "Norman, OK" },
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
                { key: "team_image", label: "Team Photo", type: "image" },
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
                { key: "logo", label: "Footer Logo", type: "image" },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
