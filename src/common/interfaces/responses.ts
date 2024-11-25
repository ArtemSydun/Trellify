import { HttpStatus } from '@nestjs/common';

export interface DefaultResponse<T> {
  message: string;
  statusCode: HttpStatus;
  data?: T,
}
