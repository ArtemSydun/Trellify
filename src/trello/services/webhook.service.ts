import { BadRequestException, ConflictException, forwardRef, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { decryptText } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import axios from 'axios';
import { TrelloWebhookRepository } from '../repositories/webhook.repository';
import { Webhook } from '../entities/webhook.entity';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { trelloApiLink, actionsEnabledByDefault } from 'src/common/constants/trello';
import { initializeUserNotificationState, updateWebhookNotifications, initializeNotificationArrays } from 'src/common/helpers/trello-notifications';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import { TrelloWebhookDetailedActions } from 'src/trello/enums/trello.actions.enum';
import { toCamelCase } from 'src/common/helpers/camelCase';
import { ActionsService } from './actions.service';
import { TrelloService } from './trello.service';
import { SharedConfigService } from './shared.config.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class WebhookService {
    private readonly webhookCallbackURL: string;
    private readonly encryptionKey: string;
    private readonly trelloApiKey: string;
    constructor(
        @Inject(forwardRef(() => UsersService))
        private readonly userService: UsersService,
        private readonly sharedConfigService: SharedConfigService,
        @Inject(forwardRef(() => ActionsService))
        private readonly actionsService: ActionsService,
        @Inject(forwardRef(() => TrelloService))
        private readonly trelloService: TrelloService,
        private readonly trelloWebhookRepository: TrelloWebhookRepository,
    ) {
        this.webhookCallbackURL = this.sharedConfigService.getWebhookCallbackURL();
        this.encryptionKey = this.sharedConfigService.getEncryptionKey();
        this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
    }

    async createTrelloWebhook(userId: string, createWebhookDto: CreateWebhookDto): Promise<DefaultResponse<Webhook>> {
        const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${createWebhookDto.boardId}`;
        const webhook = await this.trelloWebhookRepository.findOneByBoardId(createWebhookDto.boardId);

        const user = await this.userService.findUserById(userId);

        if (!user.trello.token) {
            throw new BadRequestException('Please check your trello connection');
        }

        const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);

        const url = `${trelloApiLink}/webhooks/?callbackURL=${boardPersonalWebhookURL}&idModel=${createWebhookDto.boardId}&key=${this.trelloApiKey}&token=${decryptedUserToken}`;

        if (webhook) {
            if (user.trello.webhooks.find(userWebhook => userWebhook === webhook.id)) {
                throw new ConflictException(`Webhook for board ${webhook.boardName} already exists for this user.`);
            }

            if (!webhook.subscribers.includes(user.trello.userId)) {
                webhook.subscribers.push(user.trello.userId);
            }

            const defaultUserNotifications = initializeUserNotificationState(actionsEnabledByDefault);

            const updatedNotifications = updateWebhookNotifications(user.trello.userId, webhook.notifications, defaultUserNotifications)

            await this.trelloWebhookRepository.updateById(webhook.id, { subscribers: webhook.subscribers, notifications: updatedNotifications });

            if (!user.trello.webhooks.includes(webhook.id)) {
                user.trello.webhooks.push(webhook.id);
            }

            const updatedUserProps = {
                trello: {
                    ...user.trello,
                    webhooks: user.trello.webhooks,
                }
            }

            await this.userService.updateUserById(userId, updatedUserProps);

            return {
                message: 'Webhook already exists, user added to subscribers',
                statusCode: HttpStatus.OK,
                data: webhook,
            };
        }

        try {
            const response = await axios.post(url);
            console.log('Webhook created: ', response.data);

            const boardInfoUrl = `${trelloApiLink}/boards/${response.data.idModel}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;
            const connectedBoard = await axios.get(boardInfoUrl);

            const createdWebhook = {
                ...response.data,
                boardName: connectedBoard.data.name,
                authorToken: user.trello.token,
                subscribers: [user.trello.userId],
                notifications: initializeNotificationArrays(user.trello.userId)
            };

            const updatedUser = {
                trello: {
                    ...user.trello,
                    webhooks: user.trello.webhooks ? [...user.trello.webhooks, response.data.id] : [response.data.id],
                }
            };

            await Promise.all([
                this.userService.updateUserById(userId, updatedUser),
                this.trelloWebhookRepository.create(createdWebhook),
            ]);

            return {
                message: 'Webhook created successfully',
                statusCode: HttpStatus.OK,
                data: createdWebhook,
            };

        } catch (err) {
            console.error('Error creating webhook:', err.response ? err.response.data : err.message);
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async updateTrelloWebhook(userId: string, webhookId: string, updateWebhookDto: UpdateWebhookDto): Promise<DefaultResponse<Webhook>> {
        const user = await this.userService.findUserById(userId);
        const webhookToUpdate = await this.findWebhookById(webhookId);

        let updatedNotifications;
        if (updateWebhookDto.notifications) {
            updatedNotifications = updateWebhookNotifications(user.trello.userId,
                webhookToUpdate.notifications,
                updateWebhookDto.notifications);
        } else {
            updatedNotifications = webhookToUpdate.notifications;
        }

        try {
            const updatedWebhook = await this.trelloWebhookRepository.updateById(webhookId, {
                ...updateWebhookDto,
                notifications: updatedNotifications
            });

            return {
                message: `Webhook ${webhookId} updated successfully`,
                statusCode: HttpStatus.OK,
                data: updatedWebhook
            };
        } catch (err) {
            console.error('Error updating webhook:', err.response ? err.response.data : err.message);
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async handleTrelloWebhook(webhookAction: any): Promise<any> {
        console.log(JSON.stringify(webhookAction, null, 2));

        const targetCard = webhookAction?.action?.data?.card;
        const targetBoard = webhookAction?.action?.data?.board;
        const webhook = await this.trelloWebhookRepository.findOneById(webhookAction?.webhook?.id);
        const authorizedToken = decryptText(webhook.authorToken, this.encryptionKey);

        const actionType = webhookAction?.action?.display?.translationKey;
        const targetMember = webhookAction?.action?.member;

        // console.log('target card: ', targetCard);
        // console.log('target board: ', targetBoard);

        if (!actionType || !webhook) {
            console.log('Missing action or webhook data.');
            return;
        }

        let enumKey = null;

        // Check if enum value includes action we got from webhook and transform enum key (CARD_CREATED -> cardCreated)
        if (Object.values(TrelloWebhookDetailedActions).includes(actionType)) {
            enumKey = toCamelCase(Object.keys(TrelloWebhookDetailedActions)
                .find(key => TrelloWebhookDetailedActions[key] === actionType), '_');
        }

        const subscribedMembers = enumKey ? webhook.notifications[enumKey] : [];

        if (!enumKey) {
            console.log(`Action ${actionType !== 'unknown' ? actionType : webhookAction?.action?.type} is not supported by this API`);
            return;
        }

        if (subscribedMembers.length === 0) {
            console.log(`Nobody tracks ${enumKey} action on ${webhook.boardName} board`);
            return;
        }

        let boardData = null;
        if (targetBoard) {
            boardData = await this.trelloService.findBoardById(authorizedToken, targetBoard.id);
        }

        // Handle board actions (if targetCard is not present)
        if (!targetCard && targetBoard && subscribedMembers.length !== 0) {
            console.log('Handling board action...');

            const boardMemberships = await this.trelloService.findBoardMemberships(authorizedToken, boardData.id);
            const membersToNotify = boardMemberships.filter(member =>
                subscribedMembers.includes(member.idMember) && member.memberType === 'admin'
            );

            // Notify board members
            const userPromises = membersToNotify.map(async (member) => {
                await this.actionsService.handleAdminActions(member.idMember, boardData, actionType, targetMember);
            });

            try {
                await Promise.all(userPromises);
            } catch (err) {
                console.error('Error sending messages to admins:', err);
            }
        }

        // Handle card actions (if targetCard is available)
        if (!targetMember && targetCard && subscribedMembers.length !== 0) {
            console.log(`Handling card ${actionType} action...`);

            const cardData = await this.trelloService.findCardById(authorizedToken, targetCard.id);

            // console.log('Card data:', cardData);

            const cardMembers: string[] = cardData.idMembers || [];

            const membersToNotify = cardMembers.filter(memberId =>
                subscribedMembers.includes(memberId));

            console.log('Members to notify:', membersToNotify);

            // Notify card members
            const userPromises = membersToNotify.map(async (member) => {
                await this.actionsService.handleCardActions(member, cardData, actionType);
            });

            try {
                await Promise.all(userPromises);
            } catch (err) {
                console.error('Error sending messages to card members:', err);
            }
        }

        // Handle target user action (only when targetMember is present)
        if (targetMember) {
            // Only pass `boardData` to `handleTargetAction` if it's already fetched
            await this.actionsService.handleTargetAction(
                targetMember.id,
                boardData,
                actionType,
                webhook.id,
                targetCard ? await this.trelloService.findCardById(authorizedToken, targetCard.id) : null
            );
        }
    }

    async disconnectFromTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
        const userToUpdate = await this.userService.findUserById(userId);
        const webhookToUpdate = await this.findWebhookById(webhookId);

        if (!userToUpdate.trello.webhooks.find(userWebhook => userWebhook === webhookId)) {
            throw new NotFoundException(`Webhook ${webhookId} not found`);
        }

        const updatedUserWebhooks = userToUpdate.trello.webhooks
            ? userToUpdate.trello.webhooks.filter(userWebhook => userWebhook !== webhookId)
            : [];

        const updatedUser = {
            trello: {
                webhooks: updatedUserWebhooks
            }
        };

        const updatedWebhookSubscribers = {
            subscribers: webhookToUpdate.subscribers ?
                webhookToUpdate.subscribers.filter(subscriberId => subscriberId !== userToUpdate.trello.userId)
                : []
        };

        const notificationsBooleans = Object.keys(webhookToUpdate.notifications).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {} as { [key: string]: boolean });

        const updatedNotifications = updateWebhookNotifications(userToUpdate.trello.userId, webhookToUpdate.notifications, notificationsBooleans)

        await this.userService.updateUserById(userId, updatedUser);
        await this.trelloWebhookRepository.updateById(webhookId, { ...updatedWebhookSubscribers, notifications: updatedNotifications })

        return {
            message: `Webhook ${webhookId} disconnected successfully`,
            statusCode: HttpStatus.OK,
        }
    }

    async disconnectFromAllTrelloWebhooks(userId: string): Promise<DefaultResponse<string>> {
        const userToDelete = await this.userService.findUserById(userId);
        try {
            if (!userToDelete?.trello?.webhooks || userToDelete.trello.webhooks.length === 0) {
                return {
                    message: `User ${userId} disconnected from all Trello webhooks successfully`,
                    statusCode: HttpStatus.OK,
                };
            }

            const webhooksToClear = userToDelete.trello.webhooks;

            //we create array of mongo operations to call them later in one request 
            const bulkUpdateOperations = await Promise.all(webhooksToClear.map(async webhookId => {
                const updateObject: any = {
                    $pull: { 'subscribers': userToDelete.trello.userId },
                };

                const webhook = await this.trelloWebhookRepository.findOneById(webhookId);

                //remove userId from all notifications in each webhook.notifications object
                if (webhook && webhook.notifications) {
                    Object.keys(webhook.notifications).forEach(notificationType => {
                        updateObject.$pull[`notifications.${notificationType}`] = userToDelete.trello.userId;
                    });
                }

                return {
                    updateOne: {
                        filter: { id: webhookId },
                        update: updateObject,
                    },
                };
            }));

            if (bulkUpdateOperations.length > 0) {
                await this.trelloWebhookRepository.bulkUpdateWebhooks(bulkUpdateOperations);
            }

            const updatedUser = {
                trello: {
                    webhooks: [],
                },
            };

            await this.userService.updateUserById(userId, updatedUser);

            return {
                message: `User ${userId} disconnected from all Trello webhooks successfully`,
                statusCode: HttpStatus.OK,
            };

        } catch (err) {
            console.error('Error during bulk update of webhooks:', err);
            throw new BadRequestException('Error disconnecting from all Trello webhooks');
        }
    }

    async removeTrelloWebhook(webhookId: string): Promise<DefaultResponse<null>> {
        const webhookToDelete = await this.findWebhookById(webhookId);

        const webhookAuthorToken = decryptText(webhookToDelete.authorToken, this.encryptionKey);

        try {
            await this.userService.removeWebhookFromAllUsers(webhookToDelete.id);

            await axios.delete(`${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${webhookAuthorToken}`);

            await this.trelloWebhookRepository.delete(webhookId);

            return {
                message: `Webhook ${webhookId} deleted successfully from Trello and all connected users`,
                statusCode: HttpStatus.OK,
            };
        } catch (err) {
            console.error('Error updating webhook:', err.response ? err.response.data : err.message);
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async findMemberWebhooks(userId: string): Promise<Webhook[]> {
        const user = await this.userService.findUserById(userId);
        const webhooks = await this.trelloWebhookRepository.findWebhooksConnectedToUser(user.trello.userId);

        return webhooks

        // in case if you need find all webhooks from trello which is user created
        // const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);
        // const url = `${trelloApiLink}/tokens/${decryptedUserToken}/webhooks?key=${this.trelloApiKey}`;

        // try {
        //   const response = await axios.get(url);

        //   return response.data;
        // } catch (err) {
        //   console.error('Error finding members webhooks:', err.response ? err.response.data : err.message);
        //   throw new BadRequestException(err.response ? err.response.data : err.message);
        // }
    }

    async findWebhookById(webhookId: string): Promise<Webhook> {
        const webhook = await this.trelloWebhookRepository.findOneById(webhookId);

        if (!webhook) {
            throw new NotFoundException(`Webhook with id ${webhookId} not found`);
        }

        return webhook;
    }

    async findWebhookByBoardId(boardId: string): Promise<Webhook> {
        const webhook = await this.trelloWebhookRepository.findOneByBoardId(boardId);

        if (!webhook) {
            throw new NotFoundException(`Webhook with boardId ${boardId} not found`);
        }

        return webhook;
    }

    async findAllWebhooks(): Promise<Webhook[]> {
        return await this.trelloWebhookRepository.findAll();
    }
}

