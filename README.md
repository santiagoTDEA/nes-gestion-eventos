## Base de datos con Docker

El proyecto utiliza PostgreSQL como motor de base de datos. Para facilitar el desarrollo, se incluye un archivo `docker-compose.yml` que permite levantar PostgreSQL y pgAdmin.

### Servicios

- **PostgreSQL:** base de datos principal de la aplicación.
- **pgAdmin:** herramienta web para administrar y consultar la base de datos.

Para levantar los servicios:

```bash
docker compose up -d