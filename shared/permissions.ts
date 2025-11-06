export const FEATURES = {
  DASHBOARD: 'dashboard',
  BOOKINGS: 'bookings',
  QUOTES: 'quotes',
  INVOICES: 'invoices',
  CUSTOMERS: 'customers',
  EMPLOYEES: 'employees',
  REVIEWS: 'reviews',
  NEWSLETTER: 'newsletter',
  TEAM: 'team',
  MESSAGES: 'messages',
  ACTIVITY_LOGS: 'activity_logs',
  SERVICES: 'services',
  GALLERY: 'gallery',
  FAQ: 'faq',
  SETTINGS: 'settings',
} as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  ASSIGN: 'assign',
  SEND: 'send',
  APPROVE: 'approve',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];

export interface FeaturePermissions {
  feature: Feature;
  actions: Action[];
}

export interface PermissionMetadata {
  feature: Feature;
  label: string;
  availableActions: {
    action: Action;
    label: string;
  }[];
}

export const PERMISSION_METADATA: PermissionMetadata[] = [
  {
    feature: FEATURES.DASHBOARD,
    label: 'Dashboard',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View Statistics' },
    ],
  },
  {
    feature: FEATURES.BOOKINGS,
    label: 'Bookings',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.CREATE, label: 'Create' },
      { action: ACTIONS.EDIT, label: 'Edit' },
      { action: ACTIONS.DELETE, label: 'Delete' },
      { action: ACTIONS.ASSIGN, label: 'Assign Employees' },
    ],
  },
  {
    feature: FEATURES.QUOTES,
    label: 'Quotes',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Edit Status' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.INVOICES,
    label: 'Invoices',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.CREATE, label: 'Create' },
      { action: ACTIONS.EDIT, label: 'Edit' },
      { action: ACTIONS.DELETE, label: 'Delete' },
      { action: ACTIONS.SEND, label: 'Send Payment Links' },
    ],
  },
  {
    feature: FEATURES.CUSTOMERS,
    label: 'Customers',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.CREATE, label: 'Create' },
      { action: ACTIONS.EDIT, label: 'Edit' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.EMPLOYEES,
    label: 'Employees',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.CREATE, label: 'Create' },
      { action: ACTIONS.EDIT, label: 'Edit' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.REVIEWS,
    label: 'Reviews',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.APPROVE, label: 'Approve/Deny' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.NEWSLETTER,
    label: 'Newsletter',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View Subscribers' },
      { action: ACTIONS.SEND, label: 'Send Emails' },
    ],
  },
  {
    feature: FEATURES.TEAM,
    label: 'Team Members',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.CREATE, label: 'Create' },
      { action: ACTIONS.EDIT, label: 'Edit' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.MESSAGES,
    label: 'Contact Messages',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Update Status' },
      { action: ACTIONS.DELETE, label: 'Delete' },
    ],
  },
  {
    feature: FEATURES.ACTIVITY_LOGS,
    label: 'Activity Logs',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
    ],
  },
  {
    feature: FEATURES.SERVICES,
    label: 'Services',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Edit' },
    ],
  },
  {
    feature: FEATURES.GALLERY,
    label: 'Gallery',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Edit' },
    ],
  },
  {
    feature: FEATURES.FAQ,
    label: 'FAQ',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Edit' },
    ],
  },
  {
    feature: FEATURES.SETTINGS,
    label: 'Settings',
    availableActions: [
      { action: ACTIONS.VIEW, label: 'View' },
      { action: ACTIONS.EDIT, label: 'Edit' },
    ],
  },
];

export function hasPermission(
  permissions: FeaturePermissions[],
  feature: Feature,
  action: Action
): boolean {
  const featurePerms = permissions.find(p => p.feature === feature);
  if (!featurePerms) return false;
  return featurePerms.actions.includes(action);
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: FeaturePermissions[];
}

export const DEFAULT_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'full_admin',
    name: 'Full Administrator',
    description: 'Complete access to all features',
    permissions: PERMISSION_METADATA.map(meta => ({
      feature: meta.feature,
      actions: meta.availableActions.map(a => a.action),
    })),
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Can manage bookings, quotes, customers, and team',
    permissions: [
      { feature: FEATURES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.BOOKINGS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.ASSIGN] },
      { feature: FEATURES.QUOTES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { feature: FEATURES.INVOICES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.SEND] },
      { feature: FEATURES.CUSTOMERS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { feature: FEATURES.EMPLOYEES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.REVIEWS, actions: [ACTIONS.VIEW, ACTIONS.APPROVE] },
      { feature: FEATURES.TEAM, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.MESSAGES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { feature: FEATURES.ACTIVITY_LOGS, actions: [ACTIONS.VIEW] },
    ],
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Can view and update bookings and quotes',
    permissions: [
      { feature: FEATURES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.BOOKINGS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { feature: FEATURES.QUOTES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.CUSTOMERS, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.MESSAGES, actions: [ACTIONS.VIEW] },
    ],
  },
  {
    id: 'viewer',
    name: 'View Only',
    description: 'Can only view data, no modifications',
    permissions: [
      { feature: FEATURES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.BOOKINGS, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.QUOTES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.INVOICES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.CUSTOMERS, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.EMPLOYEES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.REVIEWS, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.TEAM, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.MESSAGES, actions: [ACTIONS.VIEW] },
      { feature: FEATURES.ACTIVITY_LOGS, actions: [ACTIONS.VIEW] },
    ],
  },
];
