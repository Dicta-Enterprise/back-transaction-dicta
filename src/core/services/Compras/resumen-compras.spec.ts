import { resumirCompras } from './resumen-compras';

const fecha = (d: string) => new Date(d);

describe('resumirCompras', () => {
  const ordenes = [
    { idusuario: 1, fechacreacion: fecha('2026-07-22T10:00:00Z'), fechapago: fecha('2026-07-22T10:05:00Z') },
    { idusuario: 1, fechacreacion: fecha('2026-08-01T10:00:00Z'), fechapago: null },
    { idusuario: 2, fechacreacion: fecha('2026-09-01T10:00:00Z'), fechapago: null },
  ];

  it('marca quién compró, cuántas órdenes pagadas tiene y la fecha de la primera', () => {
    const r = resumirCompras([1, 2], ordenes);
    expect(r[0]).toEqual({
      idusuario: 1,
      compro: true,
      ordenesPagadas: 2,
      fechaPrimeraCompra: fecha('2026-07-22T10:05:00Z'),
    });
    expect(r[1]).toMatchObject({
      idusuario: 2,
      compro: true,
      ordenesPagadas: 1,
      fechaPrimeraCompra: fecha('2026-09-01T10:00:00Z'),
    });
  });

  it('devuelve una fila también para quien no ha comprado', () => {
    expect(resumirCompras([3], ordenes)).toEqual([
      { idusuario: 3, compro: false, ordenesPagadas: 0, fechaPrimeraCompra: null },
    ]);
  });

  it('no repite usuarios si el id viene duplicado y no devuelve usuarios que no se pidieron', () => {
    const r = resumirCompras([1, 1], ordenes);
    expect(r).toHaveLength(1);
    expect(r[0].idusuario).toBe(1);
  });
});
