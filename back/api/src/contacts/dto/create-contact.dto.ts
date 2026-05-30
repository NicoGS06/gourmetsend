import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, {
    message: 'El teléfono debe contener únicamente dígitos numéricos sin espacios ni símbolos (ej: 573001234567).',
  })
  phone: string;
}
