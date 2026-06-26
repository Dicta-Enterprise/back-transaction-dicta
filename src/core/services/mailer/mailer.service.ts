import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface MailOptions {
  to: string;
  nombreUsuario: string;
  subject: string;
  template?: string;
  context: Record<string, string | number>;
  scheduledAt?: Date;
  templateId?: number;
}

export interface MailResult {
  messageId: string;
}

interface BrevoPayload {
  sender: { name: string; email: string };
  to: { email: string; name: string }[];
  subject?: string;
  htmlContent?: string;
  templateId?: number;
  params?: Record<string, string | number>;
  scheduledAt?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly brevo: BrevoClient;

  constructor(private readonly config: ConfigService) {
    this.brevo = new BrevoClient({
      apiKey: this.config.get('BREVO_API_KEY'),
    });
  }

  async enviar(options: MailOptions): Promise<MailResult> {
    const payload: BrevoPayload = {
      sender: {
        name: this.config.get('MAIL_FROM_NAME', 'Dicta'),
        email: this.config.get('MAIL_FROM'),
      },
      to: [{ email: options.to, name: options.nombreUsuario }],
      ...(options.scheduledAt && {
        scheduledAt: options.scheduledAt.toISOString(),
      }),
    };

    if (options.templateId) {
      payload.templateId = Number(options.templateId);
      payload.params = options.context;
      payload.subject = options.subject;
    } else if (options.template) {
      payload.subject = options.subject;
      payload.htmlContent = this.renderTemplate(options.template, options.context);
    }

    const response = await this.brevo.transactionalEmails.sendTransacEmail(payload);
    const messageId = (response as unknown as { messageId: string })?.messageId ?? '';

    this.logger.log(`Correo enviado a: ${options.to} | messageId: ${messageId}`);

    return { messageId };
  }

 async moverACompradores(email: string): Promise<void> {
  const listaSinCompra = Number(this.config.get('BREVO_LISTA_SIN_COMPRA'));
  const listaCompradores = Number(this.config.get('BREVO_LISTA_COMPRADORES'));
  const apiKey = this.config.get<string>('BREVO_API_KEY');

  const response = await fetch(
    `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        attributes: { ES_COMPRADOR: true },
        listIds: [listaCompradores],
        unlinkListIds: [listaSinCompra],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo update failed: ${JSON.stringify(error)}`);
  }

}

  private renderTemplate(
    template: string,
    context: Record<string, string | number>,
  ): string {
    const templatePath = join(__dirname, 'templates', `${template}.html`);
    let html = readFileSync(templatePath, 'utf-8');

    Object.entries(context).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    return html;
  }
}