import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ContextoFacturacion } from './contexto-facturacion';
import { FactusService } from './factus.service';
import { PDFDocument } from 'pdf-lib';
import { ListarFacturasDto } from
  'src/application/dto/Facturacion/listar-facturas.dto';

@Injectable()
export class ConsultaFacturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factusService: FactusService,
  ) {}

  async listar(
    contexto: ContextoFacturacion,
    consulta: ListarFacturasDto,
  ) {
    const {
      pagina,
      limite,
      estadoPago,
      tipoComprobante,
      idCurso,
      fechaInicio,
      fechaFin,
    } = consulta;

    const convertirFecha = (valor: string): Date => {
      const [dia, mes, anio] = valor.split('/');

      return new Date(
        `${anio}-${mes}-${dia}T00:00:00.000Z`,
      );
    };

    const inicio = fechaInicio
      ? convertirFecha(fechaInicio)
      : undefined;

    const fin = fechaFin
      ? convertirFecha(fechaFin)
      : undefined;

    if (inicio && fin && inicio > fin) {
      throw new BadRequestException(
        'fechaInicio no puede ser posterior a fechaFin',
      );
    }

    const where: Prisma.FacturaWhereInput = {
      idUsuario: contexto.idUsuario,
    };

    if (estadoPago !== undefined) {
      where.estadoPago = estadoPago;
    }

    if (tipoComprobante !== undefined) {
      where.tipoComprobante = tipoComprobante;
    }

    if (idCurso !== undefined) {
      where.detalles = {
        some: {
          idCurso,
        },
      };
    }

    if (inicio || fin) {
      const fechaEmision: Prisma.DateTimeFilter = {};

      if (inicio) {
        fechaEmision.gte = inicio;
      }

      if (fin) {
        const siguienteDia = new Date(fin);
        siguienteDia.setUTCDate(
          siguienteDia.getUTCDate() + 1,
        );

        fechaEmision.lt = siguienteDia;
      }

      where.fechaEmision = fechaEmision;
    }

    const [facturas, total] = await this.prisma.$transaction([
      this.prisma.factura.findMany({
        where,
        include: {
          detalles: true,
        },
        orderBy: [
          { fechaEmision: 'desc' },
          { id: 'desc' },
        ],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.factura.count({ where }),
    ]);

    return {
      datos: facturas,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  async obtenerPorId(
    contexto: ContextoFacturacion,
    id: string,
  ) {
    const factura = await this.prisma.factura.findFirst({
      where: {
        id,
        idUsuario: contexto.idUsuario,
      },
      include: {
        detalles: true,
        pago: {
          select: {
            id: true,
            idorden: true,
            transactionid: true,
          },
        },
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return factura;
  }

  async descargarPdf(
    contexto: ContextoFacturacion,
    id: string,
  ): Promise<Buffer> {
    const factura = await this.prisma.factura.findFirst({
      where: {
        id,
        idUsuario: contexto.idUsuario,
      },
      select: {
        pago: {
          select: {
            numero_factura: true,
          },
        },
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    const numeroFactura = factura.pago?.numero_factura;

    if (!numeroFactura?.trim()) {
      throw new NotFoundException(
        'El comprobante todavia no esta disponible para descargar',
      );
    }

    return this.factusService.descargarPdf(numeroFactura);
  }

  async descargarTodasPdf(
    contexto: ContextoFacturacion,
  ): Promise<Buffer> {
    const facturas = await this.prisma.factura.findMany({
      where: {
        idUsuario: contexto.idUsuario,
      },
      select: {
        pago: {
          select: {
            numero_factura: true,
          },
        },
      },
      orderBy: [
        { fechaEmision: 'desc' },
        { id: 'desc' },
      ],
    });

    if (facturas.length === 0) {
      throw new NotFoundException(
        'No tienes facturas disponibles para descargar',
      );
    }

    const numeros: string[] = [];

    for (const factura of facturas) {
      const numero = factura.pago?.numero_factura;

      if (!numero?.trim()) {
        throw new NotFoundException(
          'Hay comprobantes que todavia no estan disponibles pero puedes descargar individualmente los disponibles',
        );
      }

      numeros.push(numero.trim());
    }

    const consolidado = await PDFDocument.create();

    for (const numero of numeros) {
      const contenido = await this.factusService.descargarPdf(
        numero,
      );

      try {
        const documento = await PDFDocument.load(contenido);

        if (documento.getPageCount() === 0) {
          throw new Error('Documento sin paginas');
        }

        const paginas = await consolidado.copyPages(
          documento,
          documento.getPageIndices(),
        );

        for (const pagina of paginas) {
          consolidado.addPage(pagina);
        }
      } catch {
        throw new BadGatewayException(
          'No se pudo incorporar uno de los comprobantes al PDF consolidado',
        );
      }
    }

    return Buffer.from(await consolidado.save());
  }
}