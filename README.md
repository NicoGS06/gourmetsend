# GourmetSend 🚀 - Plataforma de Mensajería Masiva Comercial

GourmetSend es una solución de software Full Stack y desacoplada diseñada específicamente para el sector gastronómico. Permite la automatización y el envío masivo de campañas de mensajería a clientes, integrando lógica de programación avanzada en el Backend para mitigar el riesgo de bloqueo de cuentas comerciales.

---

## 🌐 Despliegue y Demostración

- **Frontend en producción:** https://gourmetsend.vercel.app/


> ⚠️ **Nota de Infraestructura:** Debido a los requerimientos de procesamiento lógico, volumen de datos y aislamiento de procesos antibloqueo, el backend está diseñado arquitectónicamente para ser ejecutado en entornos locales contenerizados o servidores dedicados (requiere min. 1GB RAM). Por esta razón, se prioriza su ejecución distribuida mediante **Docker Compose** en lugar de servidores gratuitos con recursos limitados.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** NestJS, Express.js, REST APIs
- **Base de Datos:** PostgreSQL
- **DevOps:** Docker (Servicios containerizados)

---

## ✨ Características Principales

- **Arquitectura Desacoplada:** Separación total e independiente entre la interfaz de usuario (Frontend) y la lógica de negocio (Backend).
- **Lógica Antibloqueo:** Algoritmos implementados para la gestión e intervalos de envío automatizado, cuidando la reputación de las cuentas comerciales.
- **Entorno Containerizado:** Configuración completa mediante Docker para garantizar un despliegue idéntico y sin errores en desarrollo y producción.
- **Gestión de Contactos:** API REST completa para realizar operaciones de creación, lectura, actualización y eliminación (CRUD) de clientes y campañas.

---

## ⚙️ Arquitectura y Despliegue Local

El proyecto se encuentra totalmente estructurado para ser ejecutado localmente de forma rápida mediante contenedores.

### Requisitos previos
- Node.js (v18 o superior)
- Docker y Docker Compose

### Instalación Pasos:

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/NicoGS06/gourmetsend.git](https://github.com/NicoGS06/gourmetsend.git)
