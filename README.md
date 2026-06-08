# GourmetSend 🚀 - Plataforma de Mensajería Masiva Comercial

GourmetSend es una solución de software Full Stack y desacoplada diseñada específicamente para el sector gastronómico. Permite la automatización y el envío masivo de campañas de mensajería a clientes, integrando lógica de programación avanzada en el Backend para mitigar el riesgo de bloqueo de cuentas comerciales.

---

## 🌐 Despliegue y Demostración

- **Frontend en producción:** https://gourmetsend.vercel.app/


> ⚠️ **Nota de Infraestructura:** Debido a los requerimientos de procesamiento lógico, volumen de datos y aislamiento de procesos antibloqueo, el backend está diseñado arquitectónicamente para ser ejecutado en entornos locales contenerizados o servidores dedicados (requiere min. 1GB RAM). Por esta razón, se prioriza su ejecución distribuida mediante **Docker** en lugar de servidores gratuitos con recursos limitados.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** NestJS, Express.js, REST APIs
- **Base de Datos:** PostgreSQL
- **DevOps:** Docker (Servidores contenerizados únicamente en el Backend)

---

## ✨ Características Principales

- **Arquitectura Desacoplada:** Separación total e independiente entre la interfaz de usuario (Frontend) y la lógica de negocio (Backend).
- **Lógica Antibloqueo:** Algoritmos implementados para la gestión e intervalos de envío automatizado, cuidando la reputación de las cuentas comerciales.
- **Entorno Contenerizado:** Configuración de Docker en el backend para garantizar un entorno de base de datos y servidor idéntico y sin errores.
- **Gestión de Contactos:** API REST completa para realizar operaciones de creación, lectura, actualización y eliminación (CRUD) de clientes y campañas.

---

## ⚙️ Instalación y Ejecución Local

Dado que la plataforma cuenta con una arquitectura desacoplada, el entorno de desarrollo se ejecuta levantando el Backend en un contenedor de Docker y el Frontend de forma nativa con Node.js.

### 1. Requisitos previos
Asegúrate de tener instalado en tu máquina:
- [Node.js](https://nodejs.org/) (Versión 18 o superior)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 🚀 Paso 1: Levantar el Backend (Con Docker)

1. Navega a la carpeta del servidor/backend desde la raíz del proyecto:
   ```bash
   cd backend
