import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { format } from 'fast-csv';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { MailerService } from 'src/mailer/services/mailer.service';
import { CreateDistributionSubscriberDto } from '../dto/create-distribution-subscriber.dto';
import { UpdateDistributionDto } from '../dto/update-distribution.dto';
import { DistributionSubscriber } from '../entities/distribution-subscriber.entity';
import { DistributionSubscribersRepository } from '../repositories/distribution-subscribers.repository';
import { htmlTemplate1 } from '../templates/template1';

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    private readonly distributionSubscriberRepository: DistributionSubscribersRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendDistribution(
    subject: string,
  ): Promise<DefaultResponse<null>> {
    const distributor = this.configService.get(configServiceKeys.MAILER_SENDER);

    const sendDate = new Date();

    const distributionSubscribers = await this.findAllDistributionSubscribers();

    const senderPromises = distributionSubscribers.map((subscriber) => {
      const html = htmlTemplate1(
        this.configService.get(configServiceKeys.BACKEND_LINK),
        subscriber.id,
      );

      this.mailerService.sendDistribution(distributor, subscriber.email, {
        html,
        subject,
      });

      this.distributionSubscriberRepository.updateById(subscriber.id, {
        lastMessageSent: sendDate,
      });
    });

    await Promise.all(senderPromises);

    this.logger.log(`Distribution sent successfully`);

    return {
      message: `Distribution sent successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  public async createDistributionSubscriber(
    createDistributionSubscriberDto: CreateDistributionSubscriberDto,
  ): Promise<DefaultResponse<DistributionSubscriber>> {
    const { email } = createDistributionSubscriberDto;
    let subscriber: DistributionSubscriber;

    const isUserSubscribed =
      await this.distributionSubscriberRepository.existsByEmail(email);

    if (isUserSubscribed) {
      subscriber =
        await this.distributionSubscriberRepository.findOneByEmail(email);
    } else {
      subscriber = await this.distributionSubscriberRepository.create(
        createDistributionSubscriberDto,
      );
    }

    return {
      message: 'You will receive Trellify updates on your email',
      statusCode: HttpStatus.OK,
      data: subscriber,
    };
  }

  public async findAllDistributionSubscribers(): Promise<
    DistributionSubscriber[]
  > {
    return await this.distributionSubscriberRepository.findAllDistributionSubscribers();
  }

  public async findDistributionSubscriberByEmail(
    email: string,
  ): Promise<DistributionSubscriber> {
    const subscriberByTrellifyId =
      await this.distributionSubscriberRepository.findOneByEmail(email);

    if (!subscriberByTrellifyId) {
      throw new NotFoundException(
        `Email ${email} is not subscribed to Trellify news letter`,
      );
    }

    return subscriberByTrellifyId;
  }

  public async findDistributionSubscriberByTrellifyUserId(
    id: string,
  ): Promise<DistributionSubscriber> {
    const subscriberByTrellifyId =
      await this.distributionSubscriberRepository.findOneByTrellifyUserId(id);

    if (!subscriberByTrellifyId) {
      throw new NotFoundException(
        `Trellify user ${id} is not subscribed to news letter`,
      );
    }

    return subscriberByTrellifyId;
  }

  public async updateByEmail(
    email: string,
    updateDistributionDto: UpdateDistributionDto,
  ): Promise<DefaultResponse<DistributionSubscriber>> {
    const subscriberToUpdate =
      await this.distributionSubscriberRepository.findOneByEmail(email);

    if (!subscriberToUpdate) {
      throw new NotFoundException(
        `Email ${email} is not subscribed to Trellify news letter`,
      );
    }

    const updatedSubscriber =
      await this.distributionSubscriberRepository.updateById(
        subscriberToUpdate.id,
        updateDistributionDto,
      );

    return {
      message: `Email ${email} mail subscription preferences updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedSubscriber,
    };
  }

  public async removeDistributionSubscriber(
    id: string,
  ): Promise<DefaultResponse<null>> {
    const userToUnsubscribe =
      await this.distributionSubscriberRepository.findOneById(id);

    if (!userToUnsubscribe) {
      throw new NotFoundException(
        `Email ${userToUnsubscribe.email} is not subscribed to Trellify news letter`,
      );
    }

    await this.distributionSubscriberRepository.deleteByEmail(
      userToUnsubscribe.email,
    );

    return {
      message: `Email ${userToUnsubscribe.email} removed from Trellify mail subscription successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  public async exportSubscribersToCsv(res: Response) {
    // Fetch all subscribers
    const usersToExport =
      await this.distributionSubscriberRepository.findAllDistributionSubscribers();

    // Extract required fields
    const formattedUsers = usersToExport.map(
      ({ email, trellifyUserId, language, timezone }) => ({
        email,
        trellifyUserId,
        language,
        timezone,
      }),
    );

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="subscribers.csv"',
    );

    // Use fast-csv to format and send data as a response
    const csvStream = format({ headers: true });

    csvStream.pipe(res); // Stream data to response

    formattedUsers.forEach((user) => csvStream.write(user)); // Write each row

    csvStream.end(); // Finalize stream to complete response
  }
}
