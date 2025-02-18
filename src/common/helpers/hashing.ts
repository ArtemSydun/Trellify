/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as CryptoJS from 'crypto-js';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from '../enums/i18n-keys.enum';

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  i18n?: I18nContext,
): Promise<boolean> {
  const isPasswordValid = await bcrypt.compare(plainPassword, hashedPassword);

  if (!isPasswordValid) {
    throw new UnauthorizedException(
      i18n?.t(I18nKeys.ERRORS_GENERAL_INVALID_CREDENTIALS) ||
        'Invalid credentials',
    );
  }

  return true;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function encryptText(plainText: string, secretKey: string): string {
  return CryptoJS.AES.encrypt(plainText, secretKey).toString();
}

export function decryptText(encryptedText: string, secretKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
