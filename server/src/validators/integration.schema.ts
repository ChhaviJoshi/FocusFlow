import { z } from 'zod';

/**
 * Validation schemas for integration token inputs.
 * Prevents storing obviously invalid tokens and provides
 * clear error messages to the frontend.
 */

export const SlackTokenSchema = z.object({
  token: z.string()
    .min(10, 'Token is too short')
    .refine(
      (val) => val.startsWith('xoxb-') || val.startsWith('xoxp-'),
      'Slack token must start with xoxb- (bot) or xoxp- (user)'
    ),
});

export const JiraCredentialsSchema = z.object({
  domain: z.string()
    .min(1, 'Domain is required')
    .refine(
      (val) => val.includes('.atlassian.net') || val.includes('.jira.com'),
      'Domain should be like company.atlassian.net'
    ),
  email: z.string().email('Invalid email address'),
  apiToken: z.string().min(10, 'API token is too short'),
});
