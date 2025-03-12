import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionRepository } from '../repositories/subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    const newSubscription = await this.subscriptionRepository.create(
      createSubscriptionDto,
    );

    return {
      message: `Subscription ${newSubscription.name} created successfully`,
      statusCode: HttpStatus.OK,
      data: newSubscription,
    };
  }

  async findAll(): Promise<Subscription[]> {
    return await this.subscriptionRepository.findAllSubscriptions();
  }

  async findSubscriptionById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneById(id);

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} does not exist`);
    }

    return subscription;
  }

  async updateSubscriptionById(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    const subscriptionToUpdate = await this.findSubscriptionById(id);

    const updatedSubscription = await this.subscriptionRepository.updateById(
      id,
      updateSubscriptionDto,
    );

    return {
      message: `Subscription ${subscriptionToUpdate.name} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedSubscription,
    };
  }

  async deleteSubscriptionById(id: string): Promise<DefaultResponse<null>> {
    const subscriptionToDelete =
      await this.subscriptionRepository.findOneById(id);

    await this.subscriptionRepository.deleteById(id);

    return {
      message: `Subscription ${subscriptionToDelete.name} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }
}
