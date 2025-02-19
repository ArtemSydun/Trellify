import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService as MailService } from '@nestjs-modules/mailer';
import { I18nContext } from 'nestjs-i18n';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
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

  public getBottomHtml(i18n?: I18nContext) {
    const EMAIL_FOOTER = `
   <br>
   <p>${i18n?.t(I18nKeys.MESSAGES_EMAIL_IGNORE_EMAIL_DEFAULT_MESSAGE) || 'If you did not request this action, please ignore this email.'}</p>
   <br>
   <p>${i18n?.t(I18nKeys.MESSAGES_EMAIL_LINK_AVAILABLE_DEFAULT_MESSAGE) || 'This link is available only for 15 minutes'}</p>
   `;

    return EMAIL_FOOTER;
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

  public async sendRegistrationLink(
    email: string,
    token: string,
    i18n?: I18nContext,
  ): Promise<void> {
    try {
      const confirmationLink = this.getLink(
        this.configService.get(configServiceEnum.FRONTEND_LINK),
        `auth/sign-up/${token}`,
        i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT) ||
          `Confirm your email`,
      );

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT) ||
          `Confirm your email`,
        text: `Click the link to reset your password: ${confirmationLink}`,
        html: `<p>${
          i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_MESSAGE) ||
          `Please confirm your email by clicking the following link`
        }: ${confirmationLink}</p>`,
      });

      this.logger.verbose(`Registration mail sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  public async sendResetPasswordLink(
    email: string,
    token: string,
    i18n?: I18nContext,
  ): Promise<void> {
    try {
      const resetLink = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/auth/reset-password/${token}`;

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_RESET_PASSWORD_SUBJECT) ||
          'Password Reset Request',
        text: `${i18n?.t(I18nKeys.MESSAGES_EMAIL_RESET_PASSWORD_MESSAGE) || 'Click the link to reset your password'}: ${resetLink}`,
        html:
          `<p>${i18n?.t(I18nKeys.MESSAGES_EMAIL_RESET_PASSWORD_MESSAGE) || 'Click the link to reset your password'}:</p>
              <a href="${resetLink}">RESET PASSWORD</a>
              ` + this.getBottomHtml(i18n),
      });

      this.logger.verbose(`Forgot password mail sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  public async sendChangeEmailLink(
    email: string,
    token: string,
    i18n?: I18nContext,
  ): Promise<void> {
    try {
      const emailLink = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/settings/change-email/${token}`;

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_CHANGE_MAIL_SUBJECT) ||
          'Change Email Request',
        text:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_CHANGE_MAIL_MESSAGE) ||
          `Click the link to change your email: ${emailLink}`,
        html:
          `<p>${i18n?.t(I18nKeys.MESSAGES_EMAIL_CHANGE_MAIL_MESSAGE) || 'Click the link to change your email'}:</p>
              <a href="${emailLink}">CONFIRM EMAIL</a>
              ` + this.getBottomHtml(i18n),
      });

      this.logger.verbose(`Change email link sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  public async sendDeleteProfileLink(
    email: string,
    token: string,
    i18n?: I18nContext,
  ): Promise<void> {
    try {
      const emailLink = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/setttings/delete-profile/${token}`;

      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAILER_SENDER'),
        subject:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_DELETE_USER_SUBJECT) ||
          'Delete profile request',
        text:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_DELETE_USER_MESSAGE) ||
          `Click the link if you are sure that you want to delete your Trellify account: ${emailLink}`,
        html:
          `<p>${i18n?.t(I18nKeys.MESSAGES_EMAIL_DELETE_USER_MESSAGE) || 'Click the link if you are sure that you want to delete your Trellify account'}:</p>
              <a href="${emailLink}">DELETE ACCOUNT</a>
              ` + this.getBottomHtml(i18n),
      });

      this.logger.verbose(`Delete profile link sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  public async sendContactForm(
    fromEmail: string,
    subject: string,
    message: string,
    i18n?: I18nContext,
    authorized?: boolean,
  ) {
    try {
      await this.mailerService.sendMail({
        to: this.configService.get(configServiceEnum.ADMIN_MAIL),
        from: this.configService.get(configServiceEnum.MAILER_SENDER),
        replyTo: fromEmail,
        subject: `Contact Us: ${subject}`,
        text: `${authorized ? `Message from Trellify user` : `Message from website visitor`}\n Email: ${fromEmail}\n\n${message}`,
      });

      this.logger.log(`📩 Contact form submitted successfully by ${fromEmail}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send contact form: ${error.message}`);
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FAILED_SEND_EMAIL, {
          args: {
            adminEmail: this.configService.get(configServiceEnum.ADMIN_MAIL),
          },
        }) || 'Failed to send message. Please try again later.',
      );
    }
  }
}
