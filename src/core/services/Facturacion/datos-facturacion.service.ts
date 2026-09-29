import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDatosFacturacionDto } from
  'src/application/dto/Facturacion/crear-datos-facturacion.dto';
import { ActualizarDatosFacturacionDto } from
  'src/application/dto/Facturacion/actualizar-datos-facturacion.dto';
import { ContextoFacturacion } from './contexto-facturacion';

@Injectable()
export class DatosFacturacionService {
  constructor(private readonly prisma: PrismaService) {}

  private filtroAcceso(
    contexto: ContextoFacturacion,
  ): Prisma.DatosFacturacionWhereInput {
    return {
      idUsuario: contexto.idUsuario,
    };
  }

  async obtener(contexto: ContextoFacturacion) {
    return this.prisma.datosFacturacion.findMany({
      where: this.filtroAcceso(contexto),
      orderBy: [
        { fechaCreacion: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async crear(
    contexto: ContextoFacturacion,
    dto: CrearDatosFacturacionDto,
  ) {
    const idCuentaAsociada = dto.idCuentaAsociada ?? null;

    if (
      idCuentaAsociada !== null &&
      !contexto.cuentasConEscritura.includes(idCuentaAsociada)
    ) {
      throw new ForbiddenException(
        'No tienes permiso para registrar datos de esta cuenta',
      );
    }

    return this.prisma.datosFacturacion.create({
      data: {
        idUsuario:
          idCuentaAsociada === null ? contexto.idUsuario : null,
        idCuentaAsociada,
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento,
        razonSocial: dto.razonSocial,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        direccion: dto.direccion,
        departamento: dto.departamento,
        provincia: dto.provincia,
        distrito: dto.distrito,
        email: dto.email,
      },
    });
  }

  async actualizar(
    contexto: ContextoFacturacion,
    id: string,
    dto: ActualizarDatosFacturacionDto,
  ) {
    try {
      return await this.prisma.datosFacturacion.update({
        where: {
          id: id,
          AND: [this.filtroAcceso(contexto)],
        },
        data: {
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento,
          razonSocial: dto.razonSocial,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          direccion: dto.direccion,
          departamento: dto.departamento,
          provincia: dto.provincia,
          distrito: dto.distrito,
          email: dto.email,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Datos de facturacion no encontrados o sin acceso',
        );
      }

      throw error;
    }
  }
}