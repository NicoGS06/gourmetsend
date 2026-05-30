import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  messageText: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];
}
