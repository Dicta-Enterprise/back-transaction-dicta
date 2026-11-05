import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComprasInternasModule } from './infraestructure/http/Compras/compras-internas.module';

/**
 * MODO DEMOSTRACIÓN (npm run start:demo)
 *
 * Levanta SOLO el endpoint interno de compras (POST /api/internal/compras/resumen) que usa el panel de
 * administración para mostrar si cada padre ya compró y desde cuándo.
 *
 * Es seguro por construcción: no carga el módulo de pagos, ni el de carritos, ni el programador de tareas, así que
 * NO corre la tarea que envía correos de carritos abandonados cada minuto, no se conecta a Brevo, a Mercado Pago ni
 * a Factus. Solo lee órdenes de la base de datos y exige la clave interna (INTERNAL_API_KEY).
 *
 * Para el servicio completo se usa npm run start o npm run start:dev.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), ComprasInternasModule],
})
class ModuloDemostracion {}

async function bootstrap() {
  const logger = new Logger('Demostración');
  const app = await NestFactory.create(ModuloDemostracion);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const puerto = Number(process.env.PORT ?? 3001);
  await app.listen(puerto);

  logger.log(`Modo demostración en http://localhost:${puerto}/api`);
  logger.log('Solo está activo POST /api/internal/compras/resumen. Sin tareas programadas ni correos.');
}

bootstrap();
