import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUsedTrialDto {
  @ApiProperty({
    description: 'Email associated with the trial',
    example: 'email@mail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Unique identifier of the Trellify user associated with the trial',
    example: 'b23ac7e1-4a8b-4d3a-9d80-4b8b3f7c8f3d',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Timestamp when the trial subscription started',
    example: '2025-03-26T08:30:00.000Z',
  })
  @IsDate()
  trialStarts: Date;

  @ApiProperty({
    description: 'Timestamp when the trial subscription will end',
    example: '2025-04-02T08:30:00.000Z',
  })
  @IsDate()
  trialEnds: Date;

  @ApiProperty({
    description:
      'Unique identifier of the Trello user associated with the trial',
    example: 'b23ac7e1-4a8b-4d3a-9d80-4b8b3f7c8f3d',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  trelloUserId?: string | null;
}
