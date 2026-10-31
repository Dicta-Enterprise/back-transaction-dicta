import { calcularDetalleReal, PrecioInvalidoError, validarMonto } from './precio-servidor';

const catalogo = new Map([
  ['c1', { id: 'c1', nombre: 'Cyberbullying - Niños', precio: 50000 }],
  ['c2', { id: 'c2', nombre: 'Grooming - Padres', precio: 35000.4 }],
  ['gratis', { id: 'gratis', nombre: 'Curso sin precio', precio: 0 }],
]);

describe('calcularDetalleReal', () => {
  it('usa el nombre y el precio del catálogo e ignora los del cliente', () => {
    const r = calcularDetalleReal(
      [
        { idcurso: 'c1', nombrecurso: 'Nombre inventado', precio: 1 },
        { idcurso: 'c2', nombrecurso: 'Otro', precio: 2 },
      ],
      catalogo,
    );
    expect(r.detalle).toEqual([
      { idcurso: 'c1', nombrecurso: 'Cyberbullying - Niños', precio: 50000 },
      { idcurso: 'c2', nombrecurso: 'Grooming - Padres', precio: 35000 },
    ]);
    expect(r.total).toBe(85000);
  });

  it('rechaza un curso que no existe en el catálogo', () => {
    expect(() => calcularDetalleReal([{ idcurso: 'nada', nombrecurso: 'x', precio: 1 }], catalogo)).toThrow(PrecioInvalidoError);
  });

  it('rechaza un curso repetido en la misma orden', () => {
    expect(() =>
      calcularDetalleReal(
        [
          { idcurso: 'c1', nombrecurso: 'x', precio: 1 },
          { idcurso: 'c1', nombrecurso: 'x', precio: 1 },
        ],
        catalogo,
      ),
    ).toThrow('repetido');
  });

  it('rechaza un curso con precio cero o inválido', () => {
    expect(() => calcularDetalleReal([{ idcurso: 'gratis', nombrecurso: 'x', precio: 1 }], catalogo)).toThrow('precio válido');
  });
});

describe('validarMonto', () => {
  it('acepta el monto exacto', () => {
    expect(() => validarMonto(85000, 85000)).not.toThrow();
    expect(() => validarMonto(85000.2, 85000)).not.toThrow();
  });

  it('rechaza un monto manipulado', () => {
    expect(() => validarMonto(1, 85000)).toThrow(PrecioInvalidoError);
    expect(() => validarMonto(84999, 85000)).toThrow('precio real');
    expect(() => validarMonto(NaN, 85000)).toThrow(PrecioInvalidoError);
  });
});
