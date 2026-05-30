-- =========================================================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA DE MENSAJERÍA DEL RESTAURANTE
-- =========================================================================
-- Ejecuta este script en el editor de SQL (SQL Editor) de tu consola de Supabase.

-- Habilitar extensión para generar UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Contactos (contacts)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE, -- Formato internacional sin símbolos, ej: 573001234567
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Grupos (groups)
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Intermedia: Muchos a Muchos (group_contacts)
CREATE TABLE IF NOT EXISTS group_contacts (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, contact_id)
);

-- 4. Tabla de Campañas (campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,            -- Ej: "Menú del Sábado 30/05"
    message_text TEXT NOT NULL,             -- Mensaje a enviar
    image_url TEXT,                         -- URL de la imagen subida al bucket de Supabase
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed', 'paused')),
    total_recipients INT DEFAULT 0,
    sent_recipients INT DEFAULT 0,
    failed_recipients INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Destinatarios de la Campaña (campaign_recipients)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar búsquedas masivas y ordenamiento
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_group_contacts_ids ON group_contacts(group_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- =========================================================================
-- CONFIGURACIÓN DE STORAGE BUCKETS (RECOMENDADO)
-- =========================================================================
-- Nota: Puedes crear manualmente el bucket llamado "menus" en el menú de Storage
-- de Supabase, y configurarlo como PÚBLICO para que las imágenes sean accesibles.
