import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para que el frontend (puerto 5173) pueda comunicarse con la API
  app.enableCors({
    origin: '*', // En producción se puede restringir al dominio específico del frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Prefijo global para las rutas (ej: http://localhost:3001/api/contacts)
  app.setGlobalPrefix('api');

  // Habilitar class-validator globalmente para validar DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no estén en el DTO
      transform: true, // Transforma tipos automáticamente
    }),
  );

  const port = process.env.PORT || 3001;

await app.listen(port, '0.0.0.0');
console.log(`🚀 Servidor ejecutándose en: http://0.0.0.0:${port}/api`);
}
bootstrap();
