export class Carrito {
  constructor(
    public readonly id: number | null,
    public readonly idUsuario: number,
    public cursos: { idcurso: string; nombrecurso: string }[],
    public readonly createdat?: Date,
    public updatedat?: Date,
  ) {}

  static fromPrisma(data: {
    id: number;
    idusuario: number;
    createdat: Date;
    updatedat: Date | null;
    cursos: { idcurso: string; nombrecurso: string }[];
  }): Carrito {
    return new Carrito(
      data.id,
      data.idusuario,
      data.cursos.map(c => ({ idcurso: c.idcurso, nombrecurso: c.nombrecurso })),
      data.createdat,
      data.updatedat ?? undefined,
    );
  }

  agregarCurso(idcurso: string, nombrecurso: string) {
    const existe = this.cursos.some(c => c.idcurso === idcurso);

    if (existe) {
      throw new Error('El curso ya está en el carrito');
    }

    this.cursos.push({
      idcurso,
      nombrecurso,
    });
  }

  eliminarCurso(idcurso: string) {
    this.cursos = this.cursos.filter(c => c.idcurso !== idcurso);
  }

  vaciar() {
    this.cursos = [];
  }
}