import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async findAll() {
    const { data, error } = await this.client
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.client
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Contacto con ID ${id} no encontrado.`);
    }
    return data;
  }

  async create(createContactDto: CreateContactDto) {
    const { data, error } = await this.client
      .from('contacts')
      .insert([createContactDto])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('El número de teléfono ya está registrado.');
      }
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async update(id: string, updateContactDto: Partial<CreateContactDto>) {
    await this.findOne(id); // Verifica si existe

    const { data, error } = await this.client
      .from('contacts')
      .update(updateContactDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica si existe

    const { error } = await this.client
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }
    return { message: 'Contacto eliminado correctamente.' };
  }

  async bulkCreate(contacts: CreateContactDto[]) {
    if (!contacts || contacts.length === 0) {
      throw new BadRequestException('La lista de contactos no puede estar vacía.');
    }

    // Insertar masivamente
    const { data, error } = await this.client
      .from('contacts')
      .insert(contacts)
      .select();

    if (error) {
      throw new BadRequestException(`Error en importación masiva: ${error.message}`);
    }
    return data;
  }
}
