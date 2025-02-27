import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import {
  ApiCustomUnathorizedResponse,
  ApiCustomForbiddenResponse,
} from 'src/common/decorators/swagger.decorators';
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send distribution to subscribers',
    description: 'Send distribution to subscibers.',
  })
  @ApiOkResponse({
    description: 'Distribution send to all newsletter subscribers',
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  sendDistribution(@Body() distribution: { subject: string }) {
    return this.distributionService.sendDistribution(distribution.subject);
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subscribe to newsletter',
    description: 'Subscribe to newsletter by email.',
  })
  @ApiOkResponse({
    description: 'You will receive Trellify updates on your email',
  })
  create(
    @Body() createDistributionDto: CreateDistributionSubscriberDto,
  ): Promise<DefaultResponse<DistributionSubscriber>> {
    return this.distributionService.createDistributionSubscriber(
      createDistributionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin)
  @Get('subscribers/all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all distribution subscribers',
    description: 'Get all distribution subscribers.',
  })
  @ApiOkResponse({
    description: 'All subscribers',
    type: [DistributionSubscriber],
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  findAll(): Promise<DistributionSubscriber[]> {
    return this.distributionService.findAllDistributionSubscribers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin)
  @Get('subscribers/:email')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscriber by email',
    description: 'Get subscriber by email.',
  })
  @ApiOkResponse({
    description: 'Subscriber by subscriber email',
    type: DistributionSubscriber,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiNotFoundResponse()
  findOneByEmail(@Param('email') email: string) {
    return this.distributionService.findDistributionSubscriberByEmail(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin)
  @Get('subscribers/:userId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscriber by Trellify user id',
    description: 'Get subscriber by Trellify user id.',
  })
  @ApiOkResponse({
    description: 'Subscriber by Trellify user id',
    type: DistributionSubscriber,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiNotFoundResponse()
  findOneByTrellifyUserId(@Param('userId') userId: string) {
    return this.distributionService.findDistributionSubscriberByTrellifyUserId(
      userId,
    );
  }

  @Patch('subscribers/:email')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update distribution subscription by email',
    description: 'Update distribution subscription.',
  })
  @ApiOkResponse({
    description:
      'Email {email} mail subscription preferences updated successfully',
    type: DistributionSubscriber,
  })
  @ApiNotFoundResponse()
  update(
    @Param('email') email: string,
    @Body() updateDistributionDto: UpdateDistributionDto,
  ): Promise<DefaultResponse<DistributionSubscriber>> {
    return this.distributionService.updateByEmail(email, updateDistributionDto);
  }

  @Get('unsubscribe/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unsubscribe from Trellify distribution',
    description: 'Unsubscribe from Trellify distribution.',
  })
  @ApiOkResponse({
    description:
      'Email ${email} removed from Trellify mail subscription successfully',
    type: DistributionSubscriber,
  })
  @ApiNotFoundResponse()
  remove(@Param('id') id: string): Promise<DefaultResponse<null>> {
    return this.distributionService.removeDistributionSubscriber(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin)
  @Get('subscribers-csv')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export subscribers list into CSV to use on distribution website',
    description:
      'Export subscribers list into CSV to use on distribution website',
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  getCsv(@Res() res): Promise<void> {
    return this.distributionService.exportSubscribersToCsv(res);
  }
}
