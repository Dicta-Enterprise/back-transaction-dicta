import { EmitirFacturaElectronicaUseCase } from './emitir-factura-electronica.usecase';

const valores: Record<string, string> = {
  FACTUS_NUMBERING_RANGE_ID: '8',
  FACTUS_ESTABLISHMENT_NAME: 'Club Social Digital Dicta',
  FACTUS_ESTABLISHMENT_ADDRESS: 'Calle 1 # 2-3',
  FACTUS_ESTABLISHMENT_PHONE: '3000000000',
  FACTUS_ESTABLISHMENT_EMAIL: 'facturas@dicta.co',
  FACTUS_MUNICIPALITY_ID: '980',
};

const orden = {
  id: 77,
  detalleorden: [
    { idcurso: 'curso-aaa', nombrecurso: 'Cyberbullying - Niños', precio: 50000 },
    { idcurso: 'curso-bbb', nombrecurso: 'Grooming - Padres', precio: 35000 },
  ],
};
const pago = { id: 5, nombrepagante: 'Ana Pérez', emailpagante: 'ana@correo.co', metodopago: 'master' };

function crear() {
  const emitirFactura = jest.fn().mockResolvedValue({ data: { bill: { cufe: 'c', number: 'n' } } });
  const config = { getOrThrow: (k: string) => valores[k] };
  const useCase = new EmitirFacturaElectronicaUseCase({ emitirFactura } as never, config as never);
  return { useCase, emitirFactura };
}

const enviado = (emitirFactura: jest.Mock) => emitirFactura.mock.calls[0][0];

describe('EmitirFacturaElectronicaUseCase', () => {
  it('usa el documento del comprador cuando llega (antes se perdía y siempre salía el genérico)', async () => {
    const { useCase, emitirFactura } = crear();
    await useCase.ejecutar({ orden, pago, documento_pagante: '1020304050' } as never);
    expect(enviado(emitirFactura).customer.identification).toBe('1020304050');
  });

  it('sin documento usa el de consumidor final', async () => {
    const { useCase, emitirFactura } = crear();
    await useCase.ejecutar({ orden, pago } as never);
    expect(enviado(emitirFactura).customer.identification).toBe('222222222222');
  });

  it('la referencia es estable: la misma orden y pago siempre se facturan con el mismo código', async () => {
    const primero = crear();
    await primero.useCase.ejecutar({ orden, pago } as never);
    await new Promise((ok) => setTimeout(ok, 5));
    const segundo = crear();
    await segundo.useCase.ejecutar({ orden, pago } as never);

    expect(enviado(primero.emitirFactura).reference_code).toBe('ORD-77-PAG-5');
    expect(enviado(segundo.emitirFactura).reference_code).toBe(enviado(primero.emitirFactura).reference_code);
  });

  it('cada ítem lleva el código de su curso y su precio real', async () => {
    const { useCase, emitirFactura } = crear();
    await useCase.ejecutar({ orden, pago } as never);
    const items = enviado(emitirFactura).items;
    expect(items.map((i: { code_reference: string }) => i.code_reference)).toEqual(['curso-aaa', 'curso-bbb']);
    expect(items.map((i: { price: number }) => i.price)).toEqual([50000, 35000]);
  });
});
