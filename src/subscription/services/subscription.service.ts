import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlans } from '../enum/subscription-plan.enum';
import { SubscriptionRepository } from '../repositories/subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
  ) {}

  public async getSubscription(
    subscription: string | Subscription,
  ): Promise<Subscription> {
    if (typeof subscription === 'string') {
      if (isUUID(subscription)) {
        // If it's a valid UUID string, fetch the subscription by ID
        return await this.findSubscriptionById(subscription);
      } else {
        // If it's a named subscription plan, fetch it by name
        return await this.findSubscriptionByName(
          subscription as SubscriptionPlans,
        );
      }
    }
    return subscription; // If it's already a Subscription object, return it as-is
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    const isSubscriptionExists = await this.subscriptionRepository.existsByName(
      createSubscriptionDto.name,
    );

    if (isSubscriptionExists) {
      throw new ConflictException(
        `Subscription plan '${createSubscriptionDto.name}' already exist`,
      );
    }

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
      throw new NotFoundException(`Subscription plan ${id} does not exist`);
    }

    return subscription;
  }

  async findSubscriptionByName(name: SubscriptionPlans): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneByName(name);

    if (!subscription) {
      throw new NotFoundException(`Subscription plan ${name} does not exist`);
    }

    return subscription;
  }

  async updateSubscriptionById(
    subscription: string | Subscription,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<DefaultResponse<Subscription>> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const updatedSubscription = await this.subscriptionRepository.updateById(
      subscriptionToUpdate.id,
      updateSubscriptionDto,
    );

    return {
      message: `Subscription ${subscriptionToUpdate.name} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedSubscription,
    };
  }

  async addSubscriberToPlan(
    subscription: string | Subscription,
    subscriber: string | User,
  ): Promise<Subscription> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const subscriberToUpdate = await this.userService.getUser(subscriber);

    if (subscriptionToUpdate.subscribers.includes(subscriberToUpdate.id)) {
      throw new ConflictException(
        `User ${subscriberToUpdate.email} is already subscribed on ${subscriptionToUpdate.name} plan`,
      );
    }

    const updatedSubscription = await this.subscriptionRepository.updateById(
      subscriptionToUpdate.id,
      {
        subscribers: [
          ...subscriptionToUpdate.subscribers,
          subscriberToUpdate.id,
        ],
      },
    );

    return updatedSubscription;
  }

  async removeSubscriberFromPlan(
    subscription: string | Subscription,
    subscriber: string | User,
  ): Promise<DefaultResponse<User>> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const subscriberToUpdate = await this.userService.getUser(subscriber);

    if (!subscriptionToUpdate.subscribers.includes(subscriberToUpdate.id)) {
      throw new BadRequestException(
        `User ${subscriberToUpdate.id} is not subscribed on ${subscriptionToUpdate.name} plan`,
      );
    }

    const updatedSubscribers = subscriptionToUpdate.subscribers.filter(
      (subscriberId) => subscriberId !== subscriberToUpdate.id,
    );

    await this.subscriptionRepository.updateById(subscriptionToUpdate.id, {
      subscribers: updatedSubscribers,
    });

    return {
      message: `User ${subscriberToUpdate.email} successfully unsubscribed from ${subscriptionToUpdate.name} plan`,
      statusCode: HttpStatus.OK,
      data: subscriberToUpdate,
    };
  }

  async deleteSubscriptionById(id: string): Promise<DefaultResponse<null>> {
    const subscriptionToDelete =
      await this.subscriptionRepository.findOneById(id);

    if (subscriptionToDelete.subscribers) {
      throw new BadRequestException(
        `Subscription plan ${subscriptionToDelete.name} has subscribers`,
      );
    }

    await this.subscriptionRepository.deleteById(id);

    return {
      message: `Subscription ${subscriptionToDelete.name} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }
}
