import { useQuery } from "@tanstack/react-query";
import type { Feature, Action } from "@shared/permissions";

interface EmployeePermission {
  feature: Feature;
  actions: Action[];
}

export function useEmployeePermissions() {
  const { data: permissions, isLoading } = useQuery<EmployeePermission[]>({
    queryKey: ["/api/employee/permissions"],
  });

  const hasPermission = (feature: Feature, action: Action): boolean => {
    if (!permissions) return false;
    const featurePermission = permissions.find(p => p.feature === feature);
    return featurePermission ? featurePermission.actions.includes(action) : false;
  };

  const canView = (feature: Feature) => hasPermission(feature, "view");
  const canCreate = (feature: Feature) => hasPermission(feature, "create");
  const canEdit = (feature: Feature) => hasPermission(feature, "edit");
  const canDelete = (feature: Feature) => hasPermission(feature, "delete");

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}
