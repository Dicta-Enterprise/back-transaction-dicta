import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService, MailResult } from 'src/core/services/mailer/mailer.service';

export interface CarritoMailData {
  nombreUsuario: string;
  email: string;
  totalCursos: number;
  nombresCursos: string[];
  urlCarrito: string;
  intento: number;
}

@Injectable()
export class CarritoMailerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async enviarRecordatorio(data: CarritoMailData): Promise<MailResult> {
    let templateId: number;

    switch (data.intento) {
      case 1:
        templateId = this.config.get<number>(
          'BREVO_TEMPLATE_CARRITO_ABANDONADO_1',
        )!;
        break;

      case 2:
        templateId = this.config.get<number>(
          'BREVO_TEMPLATE_CARRITO_ABANDONADO_2',
        )!;
        break;

      case 3:
        templateId = this.config.get<number>(
          'BREVO_TEMPLATE_CARRITO_ABANDONADO_3',
        )!;
        break;

      default:
        templateId = this.config.get<number>(
          'BREVO_TEMPLATE_CARRITO_ABANDONADO_1',
        )!;
    }

    return this.mailerService.enviar({
      to: data.email,
      nombreUsuario: data.nombreUsuario,
      subject: `${data.nombreUsuario}, tienes cursos esperándote 🎓`,
      templateId,
      context: {
        nombreUsuario: data.nombreUsuario,
        totalCursos: data.totalCursos,
        nombresCursos: data.nombresCursos.join(', '),
        urlCarrito: data.urlCarrito,
        email: data.email,
        year: new Date().getFullYear(),
      },
    });
  }
}