export class Carrito {
  constructor(
    public readonly id: number | null,
    public readonly idUsuario: number,
    public cursos: string[],
    public estado: string = 'PENDIENTE',  
    public readonly createdat?: Date,     
    public updatedat?: Date, 
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

  marcarComoComprado() {
    this.estado = 'COMPRADO';
  }
}