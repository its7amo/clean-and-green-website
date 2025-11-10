import { useQuery } from "@tanstack/react-query";
import type { CmsContent, CmsSection, CmsAsset } from "@shared/schema";

export function useCmsContent(section?: string) {
  const { data: allContent, isLoading: contentLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/public/cms/content"],
  });

  const { data: allSections = [], isLoading: sectionsLoading } = useQuery<CmsSection[]>({
    queryKey: ["/api/public/cms/sections"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allAssets = [], isLoading: assetsLoading } = useQuery<CmsAsset[]>({
    queryKey: ["/api/public/cms/assets"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = contentLoading || sectionsLoading || assetsLoading;

  if (!allContent) {
    return { 
      content: {} as Record<string, string | undefined>, 
      assets: {} as Record<string, string | undefined>,
      isVisible: false, // Default to hidden when data is not available
      isLoading 
    };
  }

  // Filter by section if provided
  const filtered = section 
    ? allContent.filter(item => item.section === section)
    : allContent;

  // Convert content array to key-value object for easy access
  const contentMap = filtered.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string | undefined>);

  // Convert assets array to key-value object
  const assetMap = allAssets
    .filter(asset => !section || asset.section === section)
    .reduce((acc, asset) => {
      acc[asset.key] = asset.imageData;
      return acc;
    }, {} as Record<string, string | undefined>);

  // Check visibility for this section
  // Default to hidden (false) if sections fail to load, but visible (true) if section not found
  const sectionData = section ? allSections.find(s => s.section === section) : null;
  const isVisible = sectionData ? sectionData.visible : (allSections.length > 0 ? true : false);

  return { 
    content: contentMap, 
    assets: assetMap,
    isVisible,
    isLoading 
  };
}
