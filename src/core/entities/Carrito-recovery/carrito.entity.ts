export class Carrito {
  constructor(
    public readonly id: number | null,
    public readonly idUsuario: number,
    public cursos: string[],
  ) {}

  agregarCurso(idcurso: string) {
    if (this.cursos.includes(idcurso)) {
      throw new Error('El curso ya está en el carrito');
    }
    this.cursos.push(idcurso);
  }

  eliminarCurso(idcurso: string) {
    this.cursos = this.cursos.filter(c => c !== idcurso);
  }

  vaciar() {
    this.cursos = [];
  }
}