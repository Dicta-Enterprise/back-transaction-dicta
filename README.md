# Zellr

## 1. Prisma
Para inicializar prisma por instalacion ejecutar `npx prisma init`

Para obtener los cambios de prisma al codigo ejecutar `npx prisma db pull`

Para poder generar el cliente con esos cambios ejecutar `npx prisma generate`

## 2. Iniciar en modo local

Clonar el archivo `.env.template` y completar sus variables de entorno

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
