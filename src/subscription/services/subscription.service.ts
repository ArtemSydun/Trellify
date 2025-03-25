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
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { getActionEnumKey } from 'src/common/helpers/trello-notifications';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { RedisService } from 'src/redis/services/redis.service';
import { TrelloWebhooksLogicService } from 'src/trello/services/logic';
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
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => TrelloWebhooksLogicService))
    private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
  ) {}

  public async getSubscription(
    subscription: string | Subscription,
    i18n?: I18nContext,
  ): Promise<Subscription> {
    if (typeof subscription === 'string') {
      if (isUUID(subscription)) {
        // If it's a valid UUID string, fetch the subscription by ID
        return await this.findSubscriptionById(subscription, i18n);
      } else {
        // If it's a named subscription plan, fetch it by name
        return await this.findSubscriptionByName(
          subscription as SubscriptionPlans,
          i18n,
        );
      }
    }
    return subscription; // If it's already a Subscription object, return it as-is
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
    i18n?: I18nContext,
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
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_CREATED_SUCCESSFULLY, {
          args: { subscription: newSubscription.name },
        }) || `Subscription plan ${newSubscription.name} created successfully`,
      statusCode: HttpStatus.OK,
      data: newSubscription,
    };
  }

  async findAll(): Promise<Subscription[]> {
    return await this.subscriptionRepository.findAllSubscriptions();
  }

  async findSubscriptionById(
    id: string,
    i18n?: I18nContext,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneById(id);

    if (!subscription) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_DOES_NOT_EXIST, {
          args: { subscription: id },
        }) || `Subscription plan ${id} does not exist`,
      );
    }

    return subscription;
  }

  async findSubscriptionByName(
    name: SubscriptionPlans,
    i18n?: I18nContext,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneByName(name);

    if (!subscription) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_DOES_NOT_EXIST, {
          args: { subscription: name },
        }) || `Subscription plan ${name} does not exist`,
      );
    }

    return subscription;
  }

  async updateSubscriptionById(
    subscription: string | Subscription,
    updateSubscriptionDto: UpdateSubscriptionDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Subscription>> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const updatedSubscription = await this.subscriptionRepository.updateById(
      subscriptionToUpdate.id,
      updateSubscriptionDto,
    );

    let isNotificationsUpdated = false;

    for (const category of Object.keys(subscriptionToUpdate.notifications)) {
      for (const action of Object.keys(
        subscriptionToUpdate.notifications[category],
      )) {
        if (
          subscriptionToUpdate.notifications[category][action] ===
          updatedSubscription.notifications[category][action]
        ) {
          isNotificationsUpdated = true;
        }
      }
    }

    if (isNotificationsUpdated) {
      await this.trelloWebhooksLogicService.updateWebhooksForSubscribers(
        subscriptionToUpdate,
        updatedSubscription.notifications,
      );
    }

    await this.redisService.initializeSubscriptionPlans();

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_UPDATED_SUCCESSFULLY, {
          args: { subscription: subscriptionToUpdate.name },
        }) ||
        `Subscription plan ${subscriptionToUpdate.name} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedSubscription,
    };
  }

  async addSubscriberToPlan(
    subscription: string | Subscription,
    subscriber: string | User,
    i18n?: I18nContext,
  ): Promise<Subscription> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const subscriberToUpdate = await this.userService.getUser(subscriber);

    if (subscriptionToUpdate.subscribers.includes(subscriberToUpdate.id)) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_USER_ALREADY_SUBSCRIBED, {
          args: {
            user: subscriberToUpdate.email,
            subscription: subscriptionToUpdate.name,
          },
        }) ||
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
    i18n?: I18nContext,
  ): Promise<Subscription> {
    const subscriptionToUpdate = await this.getSubscription(subscription);

    const subscriberToUpdate = await this.userService.getUser(subscriber);

    if (!subscriptionToUpdate.subscribers.includes(subscriberToUpdate.id)) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_USER_NOT_SUBSCRIBED, {
          args: {
            user: subscriberToUpdate.email,
            subscription: subscriptionToUpdate.name,
          },
        }) ||
          `User ${subscriberToUpdate.email} is not subscribed on ${subscriptionToUpdate.name} plan`,
      );
    }

    const updatedSubscribers = subscriptionToUpdate.subscribers.filter(
      (subscriberId) => subscriberId !== subscriberToUpdate.id,
    );

    const updatedSubscription = await this.subscriptionRepository.updateById(
      subscriptionToUpdate.id,
      {
        subscribers: updatedSubscribers,
      },
    );

    return updatedSubscription;
  }

  async deleteSubscriptionById(
    id: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const subscriptionToDelete =
      await this.subscriptionRepository.findOneById(id);

    if (subscriptionToDelete.subscribers?.length) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_HAS_SUBSCRIBERS, {
          args: { subscription: subscriptionToDelete.name },
        }) || `Subscription plan ${subscriptionToDelete.name} has subscribers`,
      );
    }

    await this.subscriptionRepository.deleteById(id);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_DELETED_SUCCESSFULLY, {
          args: { subscription: subscriptionToDelete.name },
        }) || `Subscription ${subscriptionToDelete.name} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  async actionAvailablePlans(actionType: any): Promise<string[]> {
    const allPlans = JSON.parse(await this.redisService.getSubscriptionPlans());
    const enumKey = getActionEnumKey(actionType);

    const availablePlans: string[] = [];

    // Iterate over the plans (Object.entries gives [planName, planData])
    for (const [planName, planData] of Object.entries(allPlans)) {
      for (const notifications of Object.values(planData)) {
        // Ensure the category exists and contains the action type before accessing it
        if (notifications && notifications[enumKey] === true) {
          availablePlans.push(planName);
          break; // No need to check other categories for this plan, move to next plan
        }
      }
    }

    return availablePlans;
  }
}
