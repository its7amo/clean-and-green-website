import { storage } from './storage';
import type { InsertActivityLog } from '@shared/schema';

export interface LogContext {
  userId?: string;
  userRole: string;
  userName: string;
}

export async function logActivity(params: {
  context: LogContext;
  action: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId: string;
  entityName?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
}) {
  const { context, action, entityType, entityId, entityName, changes } = params;

  try {
    const logData: InsertActivityLog = {
      userId: context.userId || null,
      userRole: context.userRole,
      userName: context.userName,
      action,
      entityType,
      entityId,
      entityName: entityName || null,
      changes: changes || null,
    };

    await storage.createActivityLog(logData);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break operations
  }
}

// Helper to extract user context from request
export function getUserContext(req: any): LogContext {
  if (req.user) {
    return {
      userId: req.user.id,
      userRole: 'owner', // Can be extended to support different roles
      userName: req.user.username,
    };
  }
  
  // Fallback for system actions
  return {
    userRole: 'system',
    userName: 'System',
  };
}
