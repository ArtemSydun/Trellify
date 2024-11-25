import { MailerService as MailService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultResponse } from 'src/common/interfaces/responses';

@Injectable()
export class MailerService {
  private readonly logger = new Logger('Emails');

  constructor(
    private readonly mailerService: MailService,
    private readonly configService: ConfigService,
  ) { }

  public getLink(host: string, port: string, route: string, message: string) {
    return `<a href=${host}:${port}/${route}>${message}</a>`;
  }

  public async sendDistribution(
    sender: string,
    receiver: string,
    distribution: { subject: string, html: string },
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
      const resetLink = `http://${this.configService.get<string>(
        'HOST',
      )}:${this.configService.get<string>('PORT')}/auth/reset-password/${token}`;

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject: 'Password Reset Request',
        text: `Click the link to reset your password: ${resetLink}`,
        html: `<p>Click the link to reset your password: <a href="${resetLink}">RESET PASSWORD</a></p>`,
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
