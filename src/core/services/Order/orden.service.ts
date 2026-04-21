import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearVentaDto, EstadoOrden } from 'src/application/dto/Order/create-orden.dto';
import { detalleorden, orden, Prisma } from 'generated/prisma';

export type OrdenConDetalle = orden & { detalleorden: detalleorden[] };

@Injectable()
export class OrdenService {
  private readonly logger = new Logger(OrdenService.name);

  constructor(private readonly prisma: PrismaService) {}

  async crearOrden(dto: CrearVentaDto): Promise<OrdenConDetalle> {
    const orden = await this.prisma.$transaction(async (tx) => {
      const nuevaOrden = await tx.orden.create({
        data: {
          idusuario: dto.idusuario,
          estado:    EstadoOrden.PENDIENTE,  
      }});

      await tx.detalleorden.createMany({
        data: dto.detalleOrden.map((d) => ({
          idorden:     nuevaOrden.id,
          idcurso:     d.idcurso,
          nombrecurso: d.nombrecurso,
          precio:      new Prisma.Decimal(d.precio),
        })),
      });

      return tx.orden.findUniqueOrThrow({
        where: { id: nuevaOrden.id },
        include: { detalleorden: true },
      });
    });

    this.logger.log(`Orden creada: ID=${orden.id} | Usuario=${dto.idusuario}`);
    return orden;
  }

  async obtenerOrdenPorId(id: number): Promise<OrdenConDetalle> {
    const orden = await this.prisma.orden.findUnique({
      where: { id },
      include: { detalleorden: true },
    });

    if (!orden) {
      throw new NotFoundException(`No se encontró la orden con ID: ${id}`);
    }

    return orden;
  }

  async obtenerOrdenesPorUsuario(idusuario: number) {
    return this.prisma.orden.findMany({
      where: { idusuario },
      include: { detalleorden: true, pagos: true },
      orderBy: { fechacreacion: 'desc' },
    });
  }

  async actualizarEstado(idOrden: number, estadoMp: string): Promise<orden> {
    const nuevoEstado = this.mapearEstadoMp(estadoMp);

    const actualizada = await this.prisma.orden.update({
      where: { id: idOrden },
      data: { estado: nuevoEstado },
    });

    this.logger.log(`Orden ${idOrden} → ${nuevoEstado} (MP: ${estadoMp})`);
    return actualizada;
  }


  calcularMontoTotal(detalles: detalleorden[]): Prisma.Decimal {
    return detalles.reduce(
      (acc, d) => acc.add(d.precio),
      new Prisma.Decimal(0),
    );
  }

  private mapearEstadoMp(estadoMp: string): string {
    const mapa: Record<string, string> = {
      processed:       EstadoOrden.COMPLETADO,
      action_required: EstadoOrden.PENDIENTE,
      pending:         EstadoOrden.PENDIENTE,
      cancelled:       EstadoOrden.CANCELADO,
      failed:          EstadoOrden.FALLIDO,
    };
    return mapa[estadoMp] ?? EstadoOrden.PENDIENTE;
  }
}
