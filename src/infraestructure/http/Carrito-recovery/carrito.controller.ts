import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CrearCarritoDto } from 'src/application/dto/Carrito-recovery/create-carrito.dto';
import { ActualizarCarritoDto } from 'src/application/dto/Carrito-recovery/update-carrito.dto';
import { CarritoService } from 'src/core/services/Carrito-recovery/carrito.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Recovery carrito')
@Controller('carrito')
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}
  @Post()
  @ApiOperation({ summary: 'Crea un nuevo carrito con cursos' })
  crear(@Body() dto: CrearCarritoDto) {
    return this.carritoService.crear(dto);
  }
  @Patch()
  @ApiOperation({ summary: 'Actualiza un carrito (agregar/eliminar cursos)' })
  actualizar(@Body() dto: ActualizarCarritoDto) {
    return this.carritoService.actualizar(dto);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un carrito por ID del usuario' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.carritoService.eliminar(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un carrito por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.carritoService.obtener(id);
  }
}