import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService, MailResult } from 'src/core/services/mailer/mailer.service';

export interface CarritoMailData {
  nombreUsuario: string;
  email: string;
  totalCursos: number;
  urlCarrito: string;
}

@Injectable()
export class CarritoMailerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async enviarRecordatorio(data: CarritoMailData): Promise<MailResult> {
    return this.mailerService.enviar({
      to: data.email,
      nombreUsuario: data.nombreUsuario,
      subject: `${data.nombreUsuario}, tienes cursos esperándote 🎓`,
      templateId: this.config.get<number>('BREVO_TEMPLATE_CARRITO_ABANDONADO'),
      context: {
        nombreUsuario: data.nombreUsuario,
        totalCursos: data.totalCursos,
        urlCarrito: data.urlCarrito,
        email: data.email,
        year: new Date().getFullYear(),
      },
    });
  }
}