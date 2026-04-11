-- DropForeignKey
ALTER TABLE "public"."carritoCurso" DROP CONSTRAINT "carritoCurso_carritoId_fkey";

-- AddForeignKey
ALTER TABLE "carritoCurso" ADD CONSTRAINT "carritoCurso_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
