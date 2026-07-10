import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { BrevoWebhookPayload } from 'src/core/services/mailer/brevo-webhook.interface';

@Injectable()
export class WebhookBrevoUseCase {
  private readonly logger = new Logger(WebhookBrevoUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async ejecutar(payload: BrevoWebhookPayload): Promise<void> {
    const messageId = payload['message-id'];
    const evento = payload.event;
    const email = payload.email;

    this.logger.log(`Procesando evento: ${evento} | email: ${email} | messageId: ${messageId}`);

    await this.prisma.eventoCorreo.create({
      data: {
        messageid: messageId,
        evento,
        email,
      },
    });

    this.logger.log(`Evento registrado: ${evento} | email: ${email}`);
  }
}