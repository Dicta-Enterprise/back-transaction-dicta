export interface ContextoFacturacion {
  idUsuario: number;
  cuentasConLectura: readonly string[];
  cuentasConEscritura: readonly string[];
}