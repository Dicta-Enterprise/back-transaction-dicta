import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CrearVentaDto } from 'src/application/dto/sale/create-sale.dto';
import { SALES_REPOSITORY } from 'src/core/constants/constants';
import { SalesRepository } from 'src/core/repositories/sale/sales.repository';
import { ValidatorService } from 'src/shared/application/validation/validator.service';
import { SaleEntity } from 'src/core/entities/sale/sale.entity';
import { DetailsSaleEntity } from 'src/core/entities/sale/details-sale.entity';
import { type EstadoOrdenType } from 'src/shared/enums/estado-orden.enum';
type CursoResp = {
  id: string;
  precio: number;
};

const ApiCursos = 'http://localhost:3000/api/cursos';

@Injectable()
export class SalesService {
  constructor(
    @Inject(SALES_REPOSITORY) private readonly repository: SalesRepository,
    private readonly validator: ValidatorService,
    private readonly http: HttpService,
  ) {}

    private async fetchCurso(idCurso: string): Promise<CursoResp> {
    const cleanId = String(idCurso ?? '').trim().replace(/\s/g, '');
    const { data } = await firstValueFrom(this.http.get(`${ApiCursos}/${cleanId}`));
    const v = data?.data?._value; 
    return {
      id: String(v.id),
      precio: Number(v.precio),
    };
  }


  async crear(dto: CrearVentaDto): Promise<SaleEntity> {
    await this.validator.validate(dto, CrearVentaDto);

    if (!dto?.detalleOrden?.length) {
      throw new Error('Debes enviar al menos un curso en detalleOrden.');
    }

    const detallesVerificados = await Promise.all(
      dto.detalleOrden.map(async (det) => {
        if (!det?.idCurso) throw new Error('Falta idCurso en un detalle.');

        const curso = await this.fetchCurso(det.idCurso);
        if (!curso?.id) throw new Error(`Curso no encontrado: ${det.idCurso}`);
        

        const precioOficial = (Number(curso.precio));
        const precioCliente = (Number(det.precio ?? 0));

        if (precioOficial !== precioCliente) {
          throw new Error(
            `Precio no coincide para ${det.idCurso}. Esperado=${precioOficial}, recibido=${precioCliente}`
          );
        }

        return new DetailsSaleEntity(
          null,
          det.idCurso,
          det.nombreCurso,
          precioOficial,
          new Date(dto.fechaCreacion),
        );
      })
    );
     const montoTotalOficial = (
      detallesVerificados.reduce((acc, d) => acc + Number(d.precio), 0)
    );

    const venta = new SaleEntity(
      null,
      dto.idUsuario,
      montoTotalOficial,                
      dto.moneda,             
      new Date(dto.fechaCreacion),
      dto.estado ? 'CREATED' : 'FAILED',
      dto.estadoOrden as EstadoOrdenType,
      dto.codigoQR ?? '',
      detallesVerificados,
    );
    
    return this.repository.save(venta);
  }

  async listar(): Promise<SaleEntity[]> {
    return this.repository.findAll();
  }
}
