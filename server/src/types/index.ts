/**
 * Shared server-side types.
 * These mirror the frontend types but are independent — the server
 * should not import from the frontend to avoid coupling.
 */

export enum SourceType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  JIRA = 'JIRA',
  CALENDAR = 'CALENDAR',
}

export interface InboxItem {
  id: string;
  source: SourceType;
  sender: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface PrioritizedTask {
  id: string;
  originalItemId: string;
  title: string;
  summary: string;
  urgencyScore: number;
  importanceScore: number;
  reason: string;
  suggestedAction: string;
  category: 'Client' | 'Internal' | 'Project' | 'Admin';
}

export type CategoryType = 'Urgent' | 'Important' | 'Routine' | 'Noise';

export interface AnalysisResult {
  topPriorities: PrioritizedTask[];
  productivityScore: number;
  distribution: {
    urgent: number;
    important: number;
    routine: number;
    noise: number;
  };
  itemClassifications: {
    itemId: string;
    category: CategoryType;
  }[];
}

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbIntegration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;   // encrypted
  refresh_token: string | null; // encrypted
  metadata: Record<string, unknown>;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Extend express-session to include our custom session data
declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
  }
}
