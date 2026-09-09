-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('EMITIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('PEN', 'COP');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('BOLETA', 'FACTURA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'RUC', 'CARNET_EXTRANJERIA', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TARJETA_CREDITO', 'TARJETA_DEBITO');

-- CreateTable
CREATE TABLE "datos_facturacion" (
    "id" TEXT NOT NULL,
    "idUsuario" INTEGER,
    "idCuentaAsociada" TEXT,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "razonSocial" TEXT,
    "nombres" TEXT,
    "apellidos" TEXT,
    "direccion" TEXT,
    "departamento" TEXT,
    "provincia" TEXT,
    "distrito" TEXT,
    "email" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datos_facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_facturas" (
    "id" TEXT NOT NULL,
    "idFactura" TEXT NOT NULL,
    "idCurso" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "impuesto" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL,
    "idUsuario" INTEGER,
    "idCuentaAsociada" TEXT,
    "idTransaccion" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "emailCliente" TEXT,
    "direccionCliente" TEXT,
    "moneda" "Moneda" NOT NULL DEFAULT 'PEN',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "impuesto" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "estadoPago" "EstadoPago" NOT NULL,
    "urlPdf" TEXT,
    "urlXml" TEXT,
    "codigoQr" TEXT,
    "datosFacturacionSnapshot" JSONB,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'EMITIDA',
    "fechaAnulacion" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datos_facturacion_idUsuario_idx" ON "datos_facturacion"("idUsuario");

-- CreateIndex
CREATE INDEX "datos_facturacion_idCuentaAsociada_idx" ON "datos_facturacion"("idCuentaAsociada");

-- CreateIndex
CREATE INDEX "datos_facturacion_numeroDocumento_idx" ON "datos_facturacion"("numeroDocumento");

-- CreateIndex
CREATE INDEX "detalle_facturas_idFactura_idx" ON "detalle_facturas"("idFactura");

-- CreateIndex
CREATE INDEX "detalle_facturas_idCurso_idx" ON "detalle_facturas"("idCurso");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_idTransaccion_key" ON "facturas"("idTransaccion");

-- CreateIndex
CREATE INDEX "facturas_idUsuario_idx" ON "facturas"("idUsuario");

-- CreateIndex
CREATE INDEX "facturas_idCuentaAsociada_idx" ON "facturas"("idCuentaAsociada");

-- CreateIndex
CREATE INDEX "facturas_numeroDocumento_idx" ON "facturas"("numeroDocumento");

-- CreateIndex
CREATE INDEX "facturas_tipoComprobante_idx" ON "facturas"("tipoComprobante");

-- CreateIndex
CREATE INDEX "facturas_estadoPago_idx" ON "facturas"("estadoPago");

-- CreateIndex
CREATE INDEX "facturas_estado_idx" ON "facturas"("estado");

-- CreateIndex
CREATE INDEX "facturas_fechaEmision_idx" ON "facturas"("fechaEmision");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_serie_numero_key" ON "facturas"("serie", "numero");

-- AddForeignKey
ALTER TABLE "detalle_facturas" ADD CONSTRAINT "detalle_facturas_idFactura_fkey" FOREIGN KEY ("idFactura") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conservar las facturas emitidas y anuladas
CREATE FUNCTION impedir_borrado_facturas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Las facturas no se pueden eliminar físicamente; deben conservarse en el historial.';
END;
$$;

CREATE TRIGGER proteger_facturas_delete
BEFORE DELETE ON "facturas"
FOR EACH ROW
EXECUTE FUNCTION impedir_borrado_facturas();

CREATE TRIGGER proteger_facturas_truncate
BEFORE TRUNCATE ON "facturas"
FOR EACH STATEMENT
EXECUTE FUNCTION impedir_borrado_facturas();