import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { UserRoles } from 'src/user/enums/role.enum';
import { CreateDistributionSubscriberDto } from '../dto/create-distribution-subscriber.dto';
import { UpdateDistributionDto } from '../dto/update-distribution.dto';
import { DistributionSubscriber } from '../entities/distribution-subscriber.entity';
import { DistributionService } from '../services/distribution.service';

@Controller('distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin)
  @Post('send')
  sendDistribution(@Body() distribution: { subject: string }) {
    return this.distributionService.sendDistribution(distribution.subject);
  }

  @Post('subscribe')
  create(
    @Body() createDistributionDto: CreateDistributionSubscriberDto,
  ): Promise<DefaultResponse<DistributionSubscriber>> {
    return this.distributionService.createDistributionSubscriber(
      createDistributionDto,
    );
  }

  @Get('subscribers/all')
  findAll(): Promise<DistributionSubscriber[]> {
    return this.distributionService.findAllDistributionSubscribers();
  }

  @Get('subscribers/:id')
  findOne(@Param('id') id: string) {
    return this.distributionService.findDistributionSubscriberByTrellifyUserId(
      id,
    );
  }

  @Patch('subscribers/:email')
  update(
    @Param('email') email: string,
    @Body() updateDistributionDto: UpdateDistributionDto,
  ) {
    return this.distributionService.updateByEmail(email, updateDistributionDto);
  }

  @Get('unsubscribe/:id')
  remove(@Param('id') id: string) {
    return this.distributionService.removeDistributionSubscriber(id);
  }
}
