import { IsArray, IsUUID } from 'class-validator';

export class SyncContactsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds: string[];
}
