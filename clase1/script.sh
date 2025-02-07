#!/bin/bash

mkdir -p devlake
cd devlake

echo "Descargando archivos de configuración..."
wget -q https://github.com/apache/incubator-devlake/releases/download/v1.0.2-beta5/docker-compose.yml
wget -q https://github.com/apache/incubator-devlake/releases/download/v1.0.2-beta5/env.example

echo "Renombrando env.example a .env..."
mv env.example .env

echo "Generando clave de encriptación..."
ENCRYPTION_KEY=$(openssl rand -base64 2000 | tr -dc 'A-Z' | fold -w 128 | head -n 1)
echo "Clave generada: $ENCRYPTION_KEY"

echo "Actualizando ENCRYPTION_SECRET en .env..."
sed -i "s/^ENCRYPTION_SECRET=.*/ENCRYPTION_SECRET=\"$ENCRYPTION_KEY\"/" .env

echo "Iniciando contenedores con Docker Compose..."
docker compose up -d


echo "Instalación completada. Verifica que todos los contenedores estén en estado 'running'"
