# Gestión de eventos

API desarrollada con NestJS y TypeScript para gestionar eventos. El proyecto utiliza una estructura basada en Clean Architecture y expone documentación interactiva mediante Swagger.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

Desde la carpeta raíz del proyecto:

```bash
npm install
```

## Ejecución con Docker

Requisitos:

- Docker Desktop

Construir la imagen y levantar la API:

```bash
docker compose up --build
```

La API estará disponible en `http://localhost:3000` y Swagger en `http://localhost:3000/api`.

Para publicar el contenedor en el puerto `4000` del equipo:

```powershell
$env:PORT="4000"
docker compose up --build
```

Detener los contenedores:

```bash
docker compose down
```

## Ejecución

Modo normal:

```bash
npm run start
```

Modo desarrollo con recarga automática:

```bash
npm run start:dev
```

Por defecto, la API se ejecuta en:

```text
http://localhost:3000
```

Para usar otro puerto en PowerShell:

```powershell
$env:PORT="4000"
npm run start:dev
```

## Documentación Swagger

Con la aplicación ejecutándose, abre:

```text
http://localhost:3000/api
```

Si la aplicación está en el puerto `4000`, utiliza:

```text
http://localhost:4000/api
```

Swagger permite consultar los endpoints, ver sus respuestas y ejecutarlos desde el navegador.

## Estructura de Clean Architecture

```text
src/
|-- application/
|   `-- use-cases/
|       `-- get-hello.use-case.ts
|-- infrastructure/
|   |-- docs/
|   |   `-- swagger.ts
|   `-- http/
|       |-- controllers/
|       |   `-- app.controller.ts
|       `-- interceptors/
|           `-- request-headers.interceptor.ts
|-- app.module.ts
`-- main.ts
```

### Capas

- `domain`: contiene las entidades, reglas de negocio y contratos propios del sistema. No debe depender de NestJS, Express, Swagger ni de una base de datos. Esta capa se ampliará cuando se definan entidades como `Event`.
- `application`: contiene los casos de uso. Coordina las operaciones de la aplicación y utiliza contratos del dominio sin conocer los detalles de HTTP o persistencia.
- `infrastructure`: contiene los adaptadores externos, como controladores HTTP, interceptores, configuración de Swagger, repositorios y clientes de servicios.
- `app.module.ts`: registra los controladores, casos de uso e interceptores mediante el sistema de inyección de dependencias de NestJS.
- `main.ts`: inicia la aplicación y configura elementos globales, como Swagger.

## Flujo entre capas

Una nueva funcionalidad debe comenzar por el comportamiento que se quiere resolver y avanzar por las capas en este orden:

```text
Petición HTTP
  -> interceptor o guard
  -> controller
  -> DTO de entrada
  -> caso de uso
  -> entidad o regla del dominio
  -> contrato de repositorio
  -> implementación en infraestructura
  -> respuesta del caso de uso
  -> respuesta HTTP
```

### Ejemplo: crear un evento

1. `EventsController` recibe `POST /events` y valida el DTO de entrada.
2. `CreateEventUseCase` coordina la operación.
3. La entidad `Event` comprueba las reglas de negocio, como nombre obligatorio y fecha válida.
4. El caso de uso utiliza un contrato `EventRepository` para guardar el evento.
5. La implementación concreta del repositorio vive en `infrastructure` y puede utilizar PostgreSQL, MongoDB u otra tecnología.
6. El controlador devuelve la respuesta HTTP.

El caso de uso no debe importar controladores, Express ni clases concretas de una base de datos. Esto permite probar la lógica de negocio de forma independiente y cambiar la tecnología externa sin modificarla.

## Interceptor de headers

`RequestHeadersInterceptor` se encuentra en `infrastructure/http/interceptors` porque trabaja con peticiones HTTP. Está registrado como interceptor global y captura metadatos no sensibles para trazabilidad, como:

- `x-request-id`
- `user-agent`
- `origin`

No se deben registrar valores sensibles como `authorization`, `cookie`, tokens o contraseñas.

El interceptor sirve para observabilidad y tareas transversales. La autenticación y autorización deben implementarse con un `Guard`, que es el componente encargado de permitir o rechazar una petición.

## Pruebas

Pruebas unitarias:

```bash
npm test
```

Pruebas unitarias en modo observación:

```bash
npm run test:watch
```

Pruebas end-to-end:

```bash
npm run test:e2e
```

Cobertura:

```bash
npm run test:cov
```

## Validación del proyecto

Compilar el proyecto:

```bash
npm run build
```

Ejecutar ESLint:

```bash
npm run lint
```

## Tecnologías principales

- NestJS
- TypeScript
- Swagger / OpenAPI
- Jest
- Supertest
- ESLint
