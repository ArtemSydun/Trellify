import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { UserRoles } from 'src/user/enums/role.enum';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Post()
  createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    return this.subscriptionService.createSubscription(createSubscriptionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin, UserRoles.support)
  @Get()
  findAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin, UserRoles.support)
  @Get(':id')
  findOneSubscription(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionService.findSubscriptionById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Patch(':id')
  updateSubscription(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    return this.subscriptionService.updateSubscriptionById(
      id,
      updateSubscriptionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete(':id')
  removeSubscription(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionById(id);
  }
}
