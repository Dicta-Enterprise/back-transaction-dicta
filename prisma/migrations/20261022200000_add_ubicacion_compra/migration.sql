-- Dónde se hizo cada compra (país, ciudad y zona horaria). Columnas opcionales: las compras anteriores quedan sin dato.
-- No se guarda la IP, solo el resultado de ubicarla.
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_pais" VARCHAR(100);
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_ciudad" VARCHAR(100);
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_zona_horaria" VARCHAR(60);
