import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'used_trials' })
export class UsedTrial {
  @ApiProperty({
    description: 'Unique identifier for the used trial record',
    example: 'f29ac7d1-4f9b-4d6a-9c30-4f9b3f9c8f3d',
  })
  @Prop({ default: () => randomUUID() })
  id: string;

  @ApiProperty({
    description: 'Email of the user associated with the trial',
    example: 'email@mail.com',
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    description: 'Unique identifier of the user associated with the trial',
    example: 'b23ac7e1-4a8b-4d3a-9d80-4b8b3f7c8f3d',
  })
  @Prop({ required: true })
  userId: string;

  @ApiProperty({
    description: 'Unique Trello User ID linked to the trial subscription',
    example: '674ec752cba1224342f87c20',
  })
  @Prop({ type: String, default: null })
  trelloUserId: string | null;

  @ApiProperty({
    description: 'Timestamp when the trial subscription started',
    example: '2025-03-26T08:30:00.000Z',
  })
  @Prop({ type: Date })
  trialStarts: Date;

  @ApiProperty({
    description: 'Timestamp when the trial subscription will end',
    example: '2025-04-02T08:30:00.000Z',
  })
  @Prop({ type: Date })
  trialEnds: Date;
}

export const UsedTrialSchema = SchemaFactory.createForClass(UsedTrial);
