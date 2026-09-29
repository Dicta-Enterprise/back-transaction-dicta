BEGIN;

ALTER TABLE "facturas"
ALTER COLUMN "idTransaccion" TYPE INTEGER
USING ("idTransaccion"::INTEGER);

ALTER TABLE "facturas"
ADD CONSTRAINT "facturas_idTransaccion_fkey"
FOREIGN KEY ("idTransaccion")
REFERENCES "pagos"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

COMMIT;