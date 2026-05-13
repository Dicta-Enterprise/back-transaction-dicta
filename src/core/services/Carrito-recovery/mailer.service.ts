import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
      },
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
      .replace(/{{year}}/g, String(new Date().getFullYear()));

    await this.transporter.sendMail({
      from: `"${this.config.get('MAIL_FROM_NAME', 'Dicta')}" <${this.config.get('MAIL_FROM')}>`,
      to: data.email,
      subject: `${data.nombreUsuario}, tienes cursos esperándote 🎓`,
      html,
    });

    this.logger.log(`Correo enviado a: ${data.email}`);
  }
}