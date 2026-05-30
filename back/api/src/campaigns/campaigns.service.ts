import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async findAll() {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findOne(id: string) {
    const { data: campaign, error: campaignError } = await this.client
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      throw new NotFoundException(`Campaña con ID ${id} no encontrada.`);
    }

    // Obtener los destinatarios y sus detalles de contacto
    const { data: recipients, error: recipientsError } = await this.client
      .from('campaign_recipients')
      .select(`
        id,
        status,
        error_message,
        sent_at,
        contacts (
          name,
          phone
        )
      `)
      .eq('campaign_id', id);

    if (recipientsError) {
      throw new BadRequestException(recipientsError.message);
    }

    // Aplanar contactos en los destinatarios
    const flattenedRecipients = recipients.map((r: any) => ({
      id: r.id,
      status: r.status,
      error_message: r.error_message,
      sent_at: r.sent_at,
      contactName: r.contacts?.name || 'Desconocido',
      contactPhone: r.contacts?.phone || 'Desconocido',
    }));

    return {
      ...campaign,
      recipients: flattenedRecipients,
    };
  }

  async create(createCampaignDto: CreateCampaignDto) {
    const { name, messageText, imageUrl, groupIds } = createCampaignDto;

    if (!groupIds || groupIds.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un grupo de contactos.');
    }

    // 1. Obtener contactos únicos asociados a los grupos seleccionados
    const { data: relations, error: relationsError } = await this.client
      .from('group_contacts')
      .select('contact_id')
      .in('group_id', groupIds);

    if (relationsError) {
      throw new BadRequestException(`Error resolviendo contactos del grupo: ${relationsError.message}`);
    }

    if (!relations || relations.length === 0) {
      throw new BadRequestException('Los grupos seleccionados no contienen ningún contacto.');
    }

    // Eliminar duplicados
    const uniqueContactIds = Array.from(new Set(relations.map((r) => r.contact_id)));

    // 2. Crear registro de campaña
    const { data: campaign, error: campaignError } = await this.client
      .from('campaigns')
      .insert([
        {
          name,
          message_text: messageText,
          image_url: imageUrl || null,
          status: 'queued', // Comienza en cola
          total_recipients: uniqueContactIds.length,
          sent_recipients: 0,
          failed_recipients: 0,
        },
      ])
      .select()
      .single();

    if (campaignError) {
      throw new BadRequestException(`Error creando campaña: ${campaignError.message}`);
    }

    // 3. Crear registros de destinatarios (campaign_recipients)
    const recipientsToInsert = uniqueContactIds.map((contactId) => ({
      campaign_id: campaign.id,
      contact_id: contactId,
      status: 'queued',
    }));

    const { error: insertRecipientsError } = await this.client
      .from('campaign_recipients')
      .insert(recipientsToInsert);

    if (insertRecipientsError) {
      // Intenta revertir la campaña si falla
      await this.client.from('campaigns').delete().eq('id', campaign.id);
      throw new BadRequestException(`Error creando destinatarios: ${insertRecipientsError.message}`);
    }

    return campaign;
  }

  async pause(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'sending' && campaign.status !== 'queued') {
      throw new BadRequestException('Solo se pueden pausar campañas en estado enviando o en cola.');
    }

    const { data, error } = await this.client
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async resume(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'paused' && campaign.status !== 'failed') {
      throw new BadRequestException('Solo se pueden reanudar campañas pausadas o fallidas.');
    }

    // Volver a poner en cola destinatarios que no hayan sido enviados
    const { error: updateRecipientsError } = await this.client
      .from('campaign_recipients')
      .update({ status: 'queued' })
      .eq('campaign_id', id)
      .in('status', ['queued', 'sending', 'failed']); // Re-intentar los pendientes/fallidos

    if (updateRecipientsError) {
      throw new BadRequestException(`Error reanudando destinatarios: ${updateRecipientsError.message}`);
    }

    const { data, error } = await this.client
      .from('campaigns')
      .update({ status: 'queued' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.client
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }
    return { message: 'Campaña eliminada correctamente.' };
  }
}
