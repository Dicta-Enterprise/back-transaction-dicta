import { Injectable } from '@nestjs/common';
import { CrearCarritoDto } from 'src/application/dto/Carrito-recovery/create-carrito.dto';
import { ActualizarCarritoDto } from 'src/application/dto/Carrito-recovery/update-carrito.dto';
import { CrearCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/create-carrito.usecase';
import { EliminarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/delete-carrito.usecase';
import { ObtenerCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/get-carrito.usecase';
import { ActualizarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/update-carrito.usecase';


@Injectable()
export class CarritoService {
  constructor(
    private readonly crearCarritoUseCase: CrearCarritoUseCase,
    private readonly actualizarCarritoUseCase: ActualizarCarritoUseCase,
    private readonly eliminarCarritoUseCase: EliminarCarritoUseCase,
    private readonly obtenerCarritoUseCase: ObtenerCarritoUseCase, 
  ) {}


  obtener(id: number) {
    return this.obtenerCarritoUseCase.execute(id);
  }

  crear(dto: CrearCarritoDto) {
    return this.crearCarritoUseCase.execute(dto);
  }

  actualizar(dto: ActualizarCarritoDto) {
    return this.actualizarCarritoUseCase.execute(dto);
  }

  eliminar(carritoId: number) {
    return this.eliminarCarritoUseCase.execute(carritoId);
  }
}