import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PagoMailerService } from 'src/core/services/Order/pago-mailer.service';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

export interface DatosCompraAprobada {
  email: string;
  nombreUsuario: string;
  nrcompra: number;
  cursos: string[];
  montoPagado: string;
  idusuario: number;
}

/**
 * Lo que pasa cuando una compra queda aprobada: el comprador pasa a la lista de compradores, recibe el correo de
 * confirmación y se vacía su carrito. Cada acción es independiente: si una falla, las demás siguen y se registra.
 */
@Injectable()
export class PostPagoService {
  private readonly logger = new Logger(PostPagoService.name);

  constructor(
    private readonly pagoMailerService: PagoMailerService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async ejecutar(data: DatosCompraAprobada): Promise<void> {
    const resultados = await Promise.allSettled([
      this.pagoMailerService.moverACompradores(data.email),
      this.pagoMailerService.enviarConfirmacion({
        email: data.email,
        nombreUsuario: data.nombreUsuario,
        nrcompra: data.nrcompra,
        cursos: data.cursos,
        montoTotal: data.montoPagado,
        urlPlataforma: this.config.get('FRONTEND_URL', ''),
      }),
      this.prisma.carrito.deleteMany({
        where: { idusuario: data.idusuario },
      }),
    ]);

    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        this.logger.error(`Fallo en acción post-pago [${i}]: ${r.reason}`);
      }
    });
  }
}
