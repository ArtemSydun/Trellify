import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as CryptoJS from 'crypto-js';


export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new UnauthorizedException('Invalid credentials');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function generateRandomPassword(): string {
  return randomBytes(10).toString('hex');
}


export function encryptText(plainText: string, secretKey: string): string {
  return CryptoJS.AES.encrypt(plainText, secretKey).toString();
}

export function decryptText(encryptedText: string, secretKey: string): string {

  const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}