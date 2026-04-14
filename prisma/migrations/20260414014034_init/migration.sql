-- CreateEnum
CREATE TYPE "estadoorden" AS ENUM ('PENDIENTE', 'CANCELADO', 'APROBADO');

-- CreateTable
CREATE TABLE "accesos" (
    "id" SERIAL NOT NULL,
    "idrol" INTEGER NOT NULL,
    "fechacreacion" TIMESTAMP(3),
    "estado" SMALLINT,
    "descripcion" VARCHAR(200),

    CONSTRAINT "accesos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departamento" (
    "id" SERIAL NOT NULL,
    "idpais" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "estado" SMALLINT NOT NULL DEFAULT 1,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaactualizar" TIMESTAMP(6),

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalleorden" (
    "id" SERIAL NOT NULL,
    "idorden" INTEGER NOT NULL,
    "idcurso" CHAR(24) NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "nombrecurso" VARCHAR(150),
    "fechacreacion" TIMESTAMP(6) DEFAULT (now() AT TIME ZONE 'utc'::text),

    CONSTRAINT "detalleorden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentospago" (
    "id" SERIAL NOT NULL,
    "idpago" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "fechasubida" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "pdfurl" VARCHAR(500),
    "xmlurl" VARCHAR(500),
    "cdrurl" VARCHAR(500),
    "estado" SMALLINT NOT NULL DEFAULT 1,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaupdate" TIMESTAMP(6),

    CONSTRAINT "documentospago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "montototal" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(10) NOT NULL,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
    "estado" VARCHAR(20) NOT NULL,
    "estadoorden" "estadoorden" NOT NULL DEFAULT 'PENDIENTE',
    "codigoqr" VARCHAR(500),
    "mpid" TEXT,

    CONSTRAINT "orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "idorden" INTEGER NOT NULL,
    "metodopago" VARCHAR(50) NOT NULL,
    "fechapago" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "nrcompra" INTEGER,
    "tipotarjeta" VARCHAR(20),
    "nrtarjeta" VARCHAR(20),
    "nombrepagante" VARCHAR(100),
    "emailpagante" VARCHAR(150),
    "transactionid" VARCHAR(150),
    "codigoqr" VARCHAR(500),
    "brand" VARCHAR(50),
    "estadovisa" VARCHAR(30),
    "descipcionerror" VARCHAR(500),
    "billeteraqr" VARCHAR(50),
    "mpPagoid" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pais" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "estado" SMALLINT NOT NULL DEFAULT 1,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaactualizar" TIMESTAMP(6),

    CONSTRAINT "pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50),
    "password" VARCHAR(50),
    "estado" SMALLINT,
    "imageurl" VARCHAR(100),
    "idusuario" INTEGER,
    "idrol" INTEGER,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50),
    "apellidopat" VARCHAR(50),
    "apellidomat" VARCHAR(50),
    "documento" INTEGER,
    "telefono" INTEGER,
    "idusuario" INTEGER,
    "codigopostal" VARCHAR(10),
    "idpais" INTEGER,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provincia" (
    "id" SERIAL NOT NULL,
    "iddepartamento" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "estado" SMALLINT NOT NULL DEFAULT 1,
    "fechacreacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaactualizar" TIMESTAMP(6),

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" INTEGER NOT NULL,
    "nombrerol" VARCHAR(50),
    "estado" SMALLINT,
    "descripcion" VARCHAR(200),
    "tipo" VARCHAR(50),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50),
    "email" VARCHAR(50),
    "password" VARCHAR(50),
    "confirmarpassword" VARCHAR(50),
    "fechadecreacion" TIMESTAMP(3),
    "estado" SMALLINT,
    "idrol" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_documentospago_idpago" ON "documentospago"("idpago");

-- CreateIndex
CREATE UNIQUE INDEX "orden_mpid_key" ON "orden"("mpid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pagos_idorden" ON "pagos"("idorden");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_mpPagoid_key" ON "pagos"("mpPagoid");

-- AddForeignKey
ALTER TABLE "accesos" ADD CONSTRAINT "fk_accesos_rol" FOREIGN KEY ("idrol") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "departamento" ADD CONSTRAINT "fk_departamento_pais" FOREIGN KEY ("idpais") REFERENCES "pais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalleorden" ADD CONSTRAINT "fk_detalleorden_orden" FOREIGN KEY ("idorden") REFERENCES "orden"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documentospago" ADD CONSTRAINT "fk_documentospago_pagos" FOREIGN KEY ("idpago") REFERENCES "pagos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orden" ADD CONSTRAINT "fk_orden_usuarios" FOREIGN KEY ("idusuario") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "fk_pagos_orden" FOREIGN KEY ("idorden") REFERENCES "orden"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_idrol_fkey" FOREIGN KEY ("idrol") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "fk_persona_pais" FOREIGN KEY ("idpais") REFERENCES "pais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provincia" ADD CONSTRAINT "fk_provincia_departamento" FOREIGN KEY ("iddepartamento") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_idrol_fkey" FOREIGN KEY ("idrol") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
