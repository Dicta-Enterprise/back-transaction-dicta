import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CarritoMailData {
  nombreUsuario: string;
  email: string;
  totalCursos: number;
  urlCarrito: string;
}

@Injectable()
export class CarritoMailerService {
  private readonly logger = new Logger(CarritoMailerService.name);
  private readonly brevo: BrevoClient;

  constructor(private readonly config: ConfigService) {
    this.brevo = new BrevoClient({
      apiKey: this.config.get('BREVO_API_KEY'),
    });
  }

  async enviarRecordatorioCarrito(data: CarritoMailData): Promise<void> {
    const templatePath = join(
      __dirname,
      'templates',
      'carrito-abandonado.html',
    );

    let html = readFileSync(templatePath, 'utf-8');
    html = html
      .replace(/{{nombreUsuario}}/g, data.nombreUsuario)
      .replace(/{{totalCursos}}/g, String(data.totalCursos))
      .replace(/{{urlCarrito}}/g, data.urlCarrito)
      .replace(/{{year}}/g, String(new Date().getFullYear()))
      .replace(/{{email}}/g, data.email);

    await this.brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: this.config.get('MAIL_FROM_NAME', 'Dicta'),
        email: this.config.get('MAIL_FROM'),
      },
      to: [{ email: data.email, name: data.nombreUsuario }],
      subject: `${data.nombreUsuario}, tienes cursos esperándote 🎓`,
      htmlContent: html,
    });

    this.logger.log(`Correo enviado a: ${data.email}`);
  }
}