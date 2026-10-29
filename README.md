# TRANSACTION DICTA

Servicio que maneja las **compras de Mundo Dictariano**: órdenes, pagos con Mercado Pago (API de Orders), facturas electrónicas, avisos (webhook) y la revisión automática de compras pendientes.

> **¿Llegaste nuevo?** Empieza por la guía de continuidad: [`docs/INTEGRACION-MERCADOPAGO.md`](docs/INTEGRACION-MERCADOPAGO.md).
> Explica el flujo de compra, cómo configurarlo y probarlo, las decisiones tomadas, las trampas conocidas y qué falta por hacer.
> Para **ver el cobro funcionando** sin tocar producción, usa la demostración: [`demo/README.md`](demo/README.md).

## 0. Resumen rápido

```bash
npm install
npx prisma generate
cp .env_template .env   # y completa los valores (para Mercado Pago, usa credenciales de un vendedor de PRUEBA)
npm run start:dev       # necesita back-auth y back-nest encendidos
npm test                # 91 pruebas automáticas, sin internet ni base de datos
npm run demo:visual     # demostración en http://localhost:3999 (sandbox)
```

## 1. Prisma
Para inicializar prisma por instalacion ejecutar `npx prisma init`

Para obtener los cambios de prisma al codigo ejecutar `npx prisma db pull`

Para poder generar el cliente con esos cambios ejecutar `npx prisma generate`

## 2. Iniciar en modo local

Clonar el archivo `.env_template` como `.env` y completar sus variables de entorno

Ejecutar `npm run start:dev` para iniciar en modo dev


## 3. Iniciar DB en modo local con Docker

Abrir la terminar y ejecutar `docker compose up --build` y al finalizar se vera los contenedores docker corriendo

Acceder a `http://localhost:8080` para poder entrar a PgAdmin y de ahi acceder mediantes las credenciales

Crear un nuevo Grupo de Servidores en donde el nombre sera opcional y los demas campos debera llenarlos a como estan los datos en el archivo `.env.template`

Seleccionar la herramienta de QUERY y copiar y pegar el archivo SQL de la ultima version que se encuentra en la carpeta documentation

Ejecutar `npx prisma db pull` para traer todas las tablas de PostgreSQL y mantenerlas sincronizadas

Ejecutar `npx prisma generate` para poder iniciar con las ultimas atualizaciones el cliente de Prisma



## 4. Cargar a GitHub

Ejecutar `npm run lint` para verificar la calidad de codigo


## 5. ENUM EN PRISMA

Si no coincide todo el modelo script con prisma , Estos son Enums , Dichos Enums se encuentran dentro de la documentacion de la Dicta_BD_v1.sql 

 `CREATE TYPE estadoorden AS ENUM ('PENDIENTE', 'CANCELADO', 'APROBADO');`

 Esto no altera en la base de datos, ya estan directamente en prisma por codigo.
