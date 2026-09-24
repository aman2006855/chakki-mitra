import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface DownloadAndInstallOptions {
  url: string;
  filename: string;
}

export interface DownloadProgress {
  progress: number;
  downloaded: number;
  total: number;
}

export interface DownloadError {
  message: string;
}

export interface ApkUpdaterPlugin {
  downloadAndInstall(options: DownloadAndInstallOptions): Promise<{ status: string }>;
  addListener(
    eventName: 'onDownloadProgress',
    listenerFunc: (info: DownloadProgress) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onDownloadError',
    listenerFunc: (info: DownloadError) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onDownloadComplete',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
}

const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater');

export default ApkUpdater;
