
export enum SourceType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  JIRA = 'JIRA',
  CALENDAR = 'CALENDAR'
}

export interface InboxItem {
  id: string;
  source: SourceType;
  sender: string;
  subject: string; // or message preview
  content: string;
  timestamp: string;
  read: boolean;
}

export interface PrioritizedTask {
  id: string;
  originalItemId: string;
  title: string;
  summary: string;
  urgencyScore: number; // 1-10
  importanceScore: number; // 1-10
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
  // Map of itemId to its assigned category
  itemClassifications: {
    itemId: string;
    category: CategoryType;
  }[];
}

export interface UserCredentials {
  googleToken?: string; // For Gmail & Calendar
  slackToken?: string;
  jira?: {
    domain: string;
    email: string;
    apiToken: string;
  };
}
