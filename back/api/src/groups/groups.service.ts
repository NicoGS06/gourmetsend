import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async findAll() {
    // Obtenemos los grupos y un conteo sutil de contactos en cada uno
    const { data, error } = await this.client
      .from('groups')
      .select(`
        *,
        group_contacts(contact_id)
      `)
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Formateamos para retornar la cantidad de miembros en lugar de la lista completa
    return data.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.created_at,
      memberCount: group.group_contacts ? group.group_contacts.length : 0,
    }));
  }

  async findOne(id: string) {
    // Obtenemos el grupo
    const { data: group, error: groupError } = await this.client
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (groupError || !group) {
      throw new NotFoundException(`Grupo con ID ${id} no encontrado.`);
    }

    // Obtenemos los contactos vinculados a este grupo
    const { data: contacts, error: contactsError } = await this.client
      .from('group_contacts')
      .select(`
        contacts (
          id,
          name,
          phone
        )
      `)
      .eq('group_id', id);

    if (contactsError) {
      throw new BadRequestException(contactsError.message);
    }

    // Mapeamos para aplanar los resultados
    const members = contacts.map((c: any) => c.contacts).filter(Boolean);

    return {
      ...group,
      members,
    };
  }

  async create(createGroupDto: CreateGroupDto) {
    const { data, error } = await this.client
      .from('groups')
      .insert([createGroupDto])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async update(id: string, updateGroupDto: Partial<CreateGroupDto>) {
    await this.findOne(id); // Verificar existencia

    const { data, error } = await this.client
      .from('groups')
      .update(updateGroupDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    await this.findOne(id); // Verificar existencia

    const { error } = await this.client
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }
    return { message: 'Grupo eliminado correctamente.' };
  }

  async syncContacts(id: string, contactIds: string[]) {
    await this.findOne(id); // Verificar existencia del grupo

    // 1. Eliminar todas las relaciones existentes para este grupo
    const { error: deleteError } = await this.client
      .from('group_contacts')
      .delete()
      .eq('group_id', id);

    if (deleteError) {
      throw new BadRequestException(`Error limpiando contactos previos: ${deleteError.message}`);
    }

    if (contactIds.length === 0) {
      return { message: 'Todos los contactos removidos del grupo.' };
    }

    // 2. Insertar las nuevas asociaciones
    const newRelations = contactIds.map((contactId) => ({
      group_id: id,
      contact_id: contactId,
    }));

    const { error: insertError } = await this.client
      .from('group_contacts')
      .insert(newRelations);

    if (insertError) {
      throw new BadRequestException(`Error guardando nuevos contactos en el grupo: ${insertError.message}`);
    }

    return { message: 'Contactos sincronizados correctamente con el grupo.' };
  }
}
