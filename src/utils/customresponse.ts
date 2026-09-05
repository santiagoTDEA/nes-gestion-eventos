import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function CustomResponse(
    errors: ValidationError[],
): BadRequestException {
    const messages = errors.flatMap((error) => {
        if (!error.constraints) {
            return [];
        }


        return Object.values(error.constraints).map((message) => {

            if (message.includes('should not exist')) {
                return `La propiedad "${error.property}" no está permitida`;
            }


            return message;
        });
    });

    return new BadRequestException({
        message: messages,
        error: 'Solicitud inválida',
        statusCode: 400,
    });
}