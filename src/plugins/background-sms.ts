import { registerPlugin } from '@capacitor/core';

export interface SendSmsOptions {
  phoneNumber: string;
  message: string;
}

export interface SmsResult {
  success: boolean;
  message: string;
  to: string;
}

export interface PermissionResult {
  granted: boolean;
}

export interface BackgroundSmsPlugin {
  sendSms(options: SendSmsOptions): Promise<SmsResult>;
  checkPermission(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionResult>;
}

const BackgroundSms = registerPlugin<BackgroundSmsPlugin>('BackgroundSms');

export default BackgroundSms;
