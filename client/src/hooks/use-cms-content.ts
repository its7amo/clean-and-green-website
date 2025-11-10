import { useQuery } from "@tanstack/react-query";
import type { CmsContent } from "@shared/schema";

export function useCmsContent(section?: string) {
  const { data: allContent, isLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/public/cms/content"],
  });

  if (!allContent) {
    return { content: {}, isLoading };
  }

  // Filter by section if provided
  const filtered = section 
    ? allContent.filter(item => item.section === section)
    : allContent;

  // Convert array to key-value object for easy access
  const contentMap = filtered.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  return { content: contentMap, isLoading };
}
