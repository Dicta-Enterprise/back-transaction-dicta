import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookBrevoUseCase } from 'src/application/uses-cases/Carrito-recovery/webhook-brevo.usecase';
import { BrevoWebhookPayload } from 'src/core/services/mailer/brevo-webhook.interface';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookBrevoUseCase: WebhookBrevoUseCase) {}

  @Post('brevo')
  @ApiOperation({ summary: 'Recibe eventos de Brevo' })
  async recibirEvento(@Body() body: BrevoWebhookPayload): Promise<{ ok: boolean }> {
    this.logger.log(`Evento recibido: ${body.event} | email: ${body.email}`);
    await this.webhookBrevoUseCase.ejecutar(body);
    return { ok: true };
  }
}