import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService, MailResult } from 'src/core/services/mailer/mailer.service';

export interface PagoMailData {
  email: string;
  nombreUsuario: string;
  nrcompra: number;
  cursos: string[];
  montoTotal: string;
  urlPlataforma: string;
}

@Injectable()
export class PagoMailerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async enviarConfirmacion(data: PagoMailData): Promise<MailResult> {
    return this.mailerService.enviar({
      to: data.email,
      nombreUsuario: data.nombreUsuario,
      subject: `¡Tu compra fue exitosa! Orden #${data.nrcompra} 🎉`,
      templateId: this.config.get<number>('BREVO_TEMPLATE_CONFIRMACION_PAGO'),
      context: {
        nombreUsuario: data.nombreUsuario,
        nrcompra: data.nrcompra,
        cursos: data.cursos.join(', '),
        montoTotal: data.montoTotal,
        urlPlataforma: data.urlPlataforma,
        year: new Date().getFullYear(),
      },
    });
  }

  async moverACompradores(email: string): Promise<void> {
    return this.mailerService.moverACompradores(email);
  }
}