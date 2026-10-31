import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class RequestRecoveryDto {
  @ApiProperty({ description: 'Nombre de usuario', example: 'santiago.ospina' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre de usuario.' })
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    description: 'Correo de la persona vinculada al usuario',
    example: 'santiago@universidad.edu.co',
  })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu correo.' })
  @MaxLength(150)
  email!: string;
}

export class VerifyRecoveryDto {
  @ApiProperty({ description: 'Nombre de usuario', example: 'santiago.ospina' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre de usuario.' })
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    description: 'Código de 6 dígitos enviado al correo',
    example: '482913',
  })
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos.' })
  code!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Permiso temporal que devuelve la verificación del código',
  })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'El permiso para cambiar la contraseña no es válido.',
  })
  resetToken!: string;

  @ApiProperty({ description: 'Contraseña nueva', example: 'NuevaClave2026' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la contraseña nueva.' })
  @MaxLength(255)
  newPassword!: string;

  @ApiProperty({
    description: 'Contraseña nueva repetida',
    example: 'NuevaClave2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirma la contraseña nueva.' })
  @MaxLength(255)
  confirmPassword!: string;
}
