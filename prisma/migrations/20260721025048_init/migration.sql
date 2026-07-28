-- CreateTable
CREATE TABLE "carrito" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritoCurso" (
    "id" SERIAL NOT NULL,
    "carritoId" INTEGER NOT NULL,
    "idcurso" CHAR(24) NOT NULL,
    "nombrecurso" VARCHAR(150),

    CONSTRAINT "carritoCurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventoCorreo" (
    "id" SERIAL NOT NULL,
    "messageid" VARCHAR(200),
    "evento" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150),
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventoCorreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalleorden" (
    "id" SERIAL NOT NULL,
    "idorden" INTEGER NOT NULL,
    "idcurso" CHAR(24) NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "nombrecurso" VARCHAR(150),

    CONSTRAINT "detalleorden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "estado" VARCHAR(20) NOT NULL,
    "acepto_terminos" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "idorden" INTEGER NOT NULL,
    "metodopago" VARCHAR(10) NOT NULL,
    "fechapago" TIMESTAMP(6) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "nrcompra" SERIAL,
    "tipotarjeta" VARCHAR(20),
    "nombrepagante" VARCHAR(100),
    "emailpagante" VARCHAR(150),
    "transactionid" VARCHAR(150),
    "moneda" VARCHAR(10),
    "processing_mode" TEXT DEFAULT 'automatic',
    "cufe" VARCHAR(200),
    "numero_factura" VARCHAR(50),
    "factura_url" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_pagos_idorden" ON "pagos"("idorden");

-- AddForeignKey
ALTER TABLE "carritoCurso" ADD CONSTRAINT "carritoCurso_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalleorden" ADD CONSTRAINT "detalleorden_idorden_fkey" FOREIGN KEY ("idorden") REFERENCES "orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_idorden_fkey" FOREIGN KEY ("idorden") REFERENCES "orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
