import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

interface DetalleOrdenItem {
  idcurso?: string;
  nombrecurso?: string;
  precio: number | string;
}

interface OrdenPago {
  id: number | string;
  detalleOrden?: DetalleOrdenItem[];
}

@Injectable()
export class MercadopagoService {
  private client: MercadoPagoConfig;

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN || '', 
    });
  }

  async crearPreferencia(orden: OrdenPago) {
    const items = (orden.detalleOrden || []).map((item: DetalleOrdenItem, index: number) => ({
      id: item.idcurso || `item-${index + 1}`,
      title: item.nombrecurso || 'Curso',
      quantity: 1,
      unit_price: Number(item.precio),
    }));

    const preference = new Preference(this.client);

    const response = await preference.create({
      body: {
        items: items,
        external_reference: orden.id.toString(),
        back_urls: {
          success: 'http://localhost:3001/success',
          failure: 'http://localhost:3001/failure',
          pending: 'http://localhost:3001/pending',
        },
      },
    });
    
    return {
      id: response.id,
      init_point: response.init_point,
    };
  }
}