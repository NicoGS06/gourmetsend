import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcodeTerminal from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private qrCode: string | null = null;
  private status: 'DISCONNECTED' | 'INITIALIZING' | 'READY' | 'QR_CODE' = 'DISCONNECTED';
  private isProcessingQueue = false;
  private currentBatchCount = 0;

  // Variables de configuración de Throttling
  private minDelayMs: number;
  private maxDelayMs: number;
  private batchSize: number;
  private batchDelayMs: number;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    // Cargar configuraciones de env o aplicar valores por defecto ultra seguros
    this.minDelayMs = +this.configService.get<number>('MIN_DELAY_MS', 20000);
    this.maxDelayMs = +this.configService.get<number>('MAX_DELAY_MS', 45000);
    this.batchSize = +this.configService.get<number>('BATCH_SIZE', 10);
    this.batchDelayMs = +this.configService.get<number>('BATCH_DELAY_MS', 180000); // 3 minutos
  }

  onModuleInit() {
    this.initializeClient();
    // Iniciar el ciclo del despachador de colas en segundo plano
    this.startQueueDispatcher();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.destroy();
    }
  }

  private initializeClient() {
    this.logger.log('Inicializando cliente de WhatsApp...');
    this.status = 'INITIALIZING';

    this.client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'restaurante-session',
    dataPath: './sessions/whatsapp',
  }),
  puppeteer: {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    `--user-data-dir=/tmp/chromium-profile-${Date.now()}`,
  ],
}

});

    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      this.status = 'QR_CODE';
      this.logger.log('Código QR de WhatsApp generado. Escanéalo en la terminal o a través de la interfaz:');
      qrcodeTerminal.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.qrCode = null;
      this.status = 'READY';
      this.logger.log('¡WhatsApp está conectado y listo para enviar mensajes!');
    });

    this.client.on('authenticated', () => {
      this.logger.log('Sesión de WhatsApp autenticada correctamente.');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'DISCONNECTED';
      this.logger.error(`Fallo en autenticación de WhatsApp: ${msg}`);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      this.qrCode = null;
      this.logger.warn(`WhatsApp se desconectó: ${reason}`);
      // Re-inicializar después de unos segundos
      setTimeout(() => this.initializeClient(), 10000);
    });

    // Iniciar el cliente de puppeteer
    this.client.initialize().catch((err) => {
      this.logger.error('Error al inicializar el cliente de WhatsApp Puppeteer:', err.stack);
      this.status = 'DISCONNECTED';
    });
  }

  // Getters para consultar estado desde el controlador
  getStatus() {
    return {
      status: this.status,
      qr: this.qrCode,
    };
  }

  async logout() {
    try {
      await this.client.logout();
      this.status = 'DISCONNECTED';
      this.qrCode = null;
      return { message: 'Sesión cerrada correctamente.' };
    } catch (error) {
      this.logger.error('Error al cerrar sesión de WhatsApp:', error);
      throw error;
    }
  }

  // =========================================================================
  // SISTEMA DE COLA Y DESPACHADOR CON SMART THROTTLING (ANTI-BAN)
  // =========================================================================
  private startQueueDispatcher() {
    // Evaluamos la cola cada 10 segundos
    setInterval(async () => {
      if (this.status !== 'READY') {
        return; // No procesar si WhatsApp no está listo
      }
      if (this.isProcessingQueue) {
        return; // Ya hay un bucle activo procesando destinatarios
      }

      await this.processNextMessage();
    }, 10000);
  }

  private async processNextMessage() {
    const supabase = this.supabaseService.getClient();

    // 1. Buscar la campaña activa más antigua en estado 'queued' o 'sending'
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['queued', 'sending'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (campaignError || !campaign) {
      return; // No hay campañas pendientes
    }

    this.isProcessingQueue = true;
    this.logger.log(`Procesando campaña activa: "${campaign.name}" (${campaign.id})`);

    // Si estaba en 'queued', la marcamos como 'sending'
    if (campaign.status === 'queued') {
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);
    }

    try {
      // 2. Obtener el siguiente destinatario en cola de esta campaña
      const { data: recipient, error: recipientError } = await supabase
        .from('campaign_recipients')
        .select(`
          id,
          contact_id,
          contacts (
            name,
            phone
          )
        `)
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Si no hay más destinatarios en cola, finalizamos la campaña
      if (recipientError || !recipient) {
        this.logger.log(`Campaña "${campaign.name}" ha sido completada.`);
        
        // Contamos finales reales
        const { data: totalStats } = await supabase
          .from('campaign_recipients')
          .select('status')
          .eq('campaign_id', campaign.id);

        const sent = totalStats?.filter((r) => r.status === 'sent').length || 0;
        const failed = totalStats?.filter((r) => r.status === 'failed').length || 0;

        await supabase
          .from('campaigns')
          .update({
            status: 'completed',
            sent_recipients: sent,
            failed_recipients: failed,
          })
          .eq('id', campaign.id);

        this.currentBatchCount = 0; // Resetear lote
        this.isProcessingQueue = false;
        return;
      }

      // 3. Proceder al envío
      const recipientId = recipient.id;

      // Manejar la posibilidad de que Supabase retorne un objeto o un arreglo de objetos para la relación
      const contactData: any = Array.isArray(recipient.contacts)
        ? recipient.contacts[0]
        : recipient.contacts;

      const contactName = contactData?.name || 'Cliente';
      let phone = contactData?.phone;

      if (!phone) {
        throw new Error(`El número telefónico para el destinatario con ID ${recipientId} no está definido.`);
      }

      // Asegurar formato de whatsapp: debe terminar en @c.us
      if (!phone.endsWith('@c.us')) {
        phone = `${phone}@c.us`;
      }

      // Marcar destinatario como en proceso de envío
      await supabase
        .from('campaign_recipients')
        .update({ status: 'sending' })
        .eq('id', recipientId);

      this.logger.log(`Enviando mensaje a ${contactName} (${phone})...`);

      // Personalizar el mensaje con el nombre
      const customizedMessage = campaign.message_text.replace(/\{\{nombre\}\}/gi, contactName);

      let success = false;
      let errMsg: string | null = null;

      try {
        if (campaign.image_url) {
          // Enviar con imagen
          const media = await MessageMedia.fromUrl(campaign.image_url);
          await this.client.sendMessage(phone, media, {
            caption: customizedMessage,
          });
        } else {
          // Enviar solo texto
          await this.client.sendMessage(phone, customizedMessage);
        }
        success = true;
        this.logger.log(`Mensaje enviado exitosamente a ${contactName}.`);
      } catch (sendErr) {
        success = false;
        errMsg = sendErr.message || 'Error desconocido de WhatsApp';
        this.logger.error(`Error enviando a ${contactName}: ${errMsg}`);
      }

      // 4. Actualizar estado del destinatario
      const updateData: any = {
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : null,
      };
      if (errMsg) {
        updateData.error_message = errMsg;
      }

      await supabase
        .from('campaign_recipients')
        .update(updateData)
        .eq('id', recipientId);

      // 5. Actualizar los contadores de la campaña en tiempo real
      const { data: updatedStats } = await supabase
        .from('campaign_recipients')
        .select('status')
        .eq('campaign_id', campaign.id);

      const sentCount = updatedStats?.filter((r) => r.status === 'sent').length || 0;
      const failedCount = updatedStats?.filter((r) => r.status === 'failed').length || 0;

      await supabase
        .from('campaigns')
        .update({
          sent_recipients: sentCount,
          failed_recipients: failedCount,
        })
        .eq('id', campaign.id);

      // =======================================================================
      // APLICAR LÓGICA DE ESPERA DINÁMICA (SMART THROTTLING)
      // =======================================================================
      this.currentBatchCount++;
      let delayMs = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1)) + this.minDelayMs;

      // Si alcanzamos el tamaño máximo del lote, forzamos un descanso más prolongado
      if (this.currentBatchCount >= this.batchSize) {
        this.logger.warn(
          `Lote de ${this.batchSize} mensajes alcanzado. Iniciando periodo de enfriamiento (cooling-off) de ${this.batchDelayMs / 1000} segundos para seguridad de la cuenta...`,
        );
        delayMs = this.batchDelayMs;
        this.currentBatchCount = 0; // Resetear contador de lote
      } else {
        this.logger.log(`Esperando retardo protector de ${delayMs / 1000}s para simular comportamiento humano...`);
      }

      // Dormir hilo de forma controlada antes de procesar el siguiente
      await new Promise((resolve) => setTimeout(resolve, delayMs));

    } catch (err) {
      this.logger.error('Error crítico en ciclo de procesador de mensajería:', err.stack);
    } finally {
      this.isProcessingQueue = false; // Liberar procesador
    }
  }
}
