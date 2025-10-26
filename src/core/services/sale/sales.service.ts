import { Inject, Injectable } from '@nestjs/common';
import { CrearVentaDto } from 'src/application/dto/sale/create-sale.dto';
import { SALES_REPOSITORY } from 'src/core/constants/constants';
import { SalesRepository } from 'src/core/repositories/sale/sales.repository';
import { ValidatorService } from 'src/shared/application/validation/validator.service';
import { SaleEntity } from 'src/core/entities/sale/sale.entity';
import { DetailsSaleEntity } from 'src/core/entities/sale/DetailsSale.entity';

type EstadoOrdenEnum = 'PENDIENTE' | 'CANCELADO' | 'APROBADO';

@Injectable()
export class SalesService {
  constructor(
    @Inject(SALES_REPOSITORY) private readonly repository: SalesRepository,
    private readonly validator: ValidatorService,
  ) {}

  async crear(dto: CrearVentaDto): Promise<SaleEntity> {
  await this.validator.validate(dto, CrearVentaDto);
  const estadoTecnico = dto.estado ? 'CREATED' : 'FAILED';
  const estadoOrden = dto.estadoOrden.toUpperCase() as EstadoOrdenEnum;
  const detalles = dto.detalleOrden.map(
    detalle =>
      new DetailsSaleEntity(
        null,
        detalle.idCurso,
        detalle.nombreCurso,
        detalle.precio,
        new Date(dto.fechaCreacion),
      ),
  );

  const venta = new SaleEntity(
    null,
    dto.idUsuario,
    dto.montoTotal,
    dto.moneda,
    new Date(dto.fechaCreacion),
    estadoTecnico,
    estadoOrden,           
    dto.codigoQR ?? '',
    detalles,
  );

  return this.repository.save(venta);
}

  async listar(): Promise<SaleEntity[]> {
    return this.repository.findAll();
  }
}
