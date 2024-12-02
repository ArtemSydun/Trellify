import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { error } from 'console';
import { Errors } from '../constants/enums';

/**
 * Custom decorator to provide a custom response schema with dynamic message and status code.
 * @param entityName - The name of the entity (e.g., "User")
 * @param property - The property that was not found (e.g., "id", "email")
 */



export function ApiCustomNotFoundResponse(entityName: string, property: string) {
    const messageTemplate = `${entityName} with ${property} {{${property}}} not found`;

    return applyDecorators(
        ApiResponse({
            status: HttpStatus.NOT_FOUND,
            description: `${entityName} not found`,
            schema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: messageTemplate,
                    },
                    error: {
                        type: 'string',
                        example: Errors.NOT_FOUND
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.NOT_FOUND,
                    },
                },
            },
        })
    );
}

export function ApiCustomConflictResponse(entityName: string, property: string) {
    const messageTemplate = `${entityName} {{${property}}} already exist`;

    return applyDecorators(
        ApiResponse({
            status: HttpStatus.CONFLICT,
            description: `${entityName} already exist`,
            schema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: messageTemplate,
                    },
                    error: {
                        type: 'string',
                        example: Errors.CONFLICT
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.CONFLICT,
                    },
                },
            },
        })
    );
}

export function ApiCustomUnathorizedResponse() {
    const messageTemplate = `Invalid or missing JWT token`;

    return applyDecorators(
        ApiResponse({
            status: HttpStatus.UNAUTHORIZED,
            description: `Unathorized`,
            schema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: messageTemplate,
                    },
                    error: {
                        type: 'string',
                        example: Errors.UNATHORIZED
                    },
                    statusCode: {
                        type: 'number',
                        example: HttpStatus.UNAUTHORIZED,
                    },
                },
            },
        })
    );
}
