import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService as MailService } from '@nestjs-modules/mailer';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { DefaultResponse } from 'src/common/interfaces/responses';

@Injectable()
export class MailerService {
  private readonly logger = new Logger('Emails');

  constructor(
    private readonly mailerService: MailService,
    private readonly configService: ConfigService,
  ) {}

  public getLink(apiUrl: string, route: string, message: string) {
    return `<a href=${apiUrl}/${route}>${message}</a>`;
  }

  public async sendDistribution(
    sender: string,
    receiver: string,
    distribution: { subject: string; html: string },
  ): Promise<DefaultResponse<null>> {
    try {
      const { subject, html } = distribution;

      await this.mailerService.sendMail({
        to: receiver,
        from: sender,
        subject,
        html,
      });

      this.logger.verbose(
        `Email sent to ${receiver}, data: ${JSON.stringify(distribution)}`,
      );

      return { message: 'Mail sent successfully', statusCode: HttpStatus.OK };
    } catch (err) {
      this.logger.error(err.message);
      throw new BadRequestException(err.message);
    }
  }

  public async sendResetPasswordLink(
    email: string,
    token: string,
  ): Promise<DefaultResponse<null>> {
    try {
      const resetLink = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/auth/reset-password/${token}`;

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject: 'Password Reset Request',
        text: `Click the link to reset your password: ${resetLink}`,
        html: `<p>Click the link to reset your password:</p>
              <a href="${resetLink}">RESET PASSWORD</a>
              <br>
              <p>If you did not request this reset, please ignore this email.</p>
              <br>
              <p>This link are available only for 15 minutes.</p>`,
      });

      this.logger.verbose(`Forgot password mail sent to ${email}`);

      return {
        message: `Password reset link sent to ${email}`,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}
