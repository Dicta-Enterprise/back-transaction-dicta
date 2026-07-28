import { Carrito } from '../entities/Carrito-recovery/carrito.entity';

export interface CarritoRepository {
  findAbandonados(desde: Date, hasta: Date): Promise<Carrito[]>;
}