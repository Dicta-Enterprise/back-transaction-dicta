export interface BrevoWebhookPayload {
  event: string;
  email: string;
  'message-id': string;
  date: string;
  ts_epoch: number;
  subject?: string;
  template_id?: number;
  reason?: string;
  link?: string;
  user_agent?: string;
  device_used?: string;
}