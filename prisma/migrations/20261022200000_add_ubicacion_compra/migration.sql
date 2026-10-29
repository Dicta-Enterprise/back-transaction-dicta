-- Dónde se hizo cada compra (país, ciudad y zona horaria). Columnas opcionales: las compras anteriores quedan sin dato.
-- No se guarda la IP, solo el resultado de ubicarla. Todo es idempotente (IF NOT EXISTS): se puede repetir sin efectos.

-- "ip" ya existe en la base real (migración add_ip_orden de la issue #85, que nunca llegó al repositorio). Se declara
-- aquí para que una base creada desde cero tenga la misma forma que la real.
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ip" VARCHAR(45);

ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_pais" VARCHAR(100);
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_ciudad" VARCHAR(100);
ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "ubicacion_zona_horaria" VARCHAR(60);
