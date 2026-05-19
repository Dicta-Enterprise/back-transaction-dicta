import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
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
  private readonly resend: Resend;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY'));
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

    const { error } = await this.resend.emails.send({
      from: 'Dicta <onboarding@resend.dev>', // ← dominio sandbox de Resend para desarrollo
      to: data.email,
      subject: `${data.nombreUsuario}, tienes cursos esperándote 🎓`,
      html,
    });

    if (error) {
      throw new Error(`Error al enviar correo: ${error.message}`);
    }

    this.logger.log(`Correo enviado a: ${data.email}`);
  }
}