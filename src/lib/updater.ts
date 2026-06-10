import type { Update } from '@tauri-apps/plugin-updater';
import { isPortable, isTauri } from './api';

/**
 * Manual update flow on top of tauri-plugin-updater: nothing runs without an
 * explicit user action. `checkForUpdate` queries the `latest.json` of the most
 * recent GitHub release; `installUpdate` then downloads and runs the NSIS
 * installer for the update found by the last check.
 *
 * The portable exe can't replace itself while running, so for it the check
 * still works but installing means opening the release page (`RELEASES_URL`).
 */

export const RELEASES_URL = 'https://github.com/rochesebastien/Taffk/releases/latest';

export type UpdateInfo = {
  version: string;
  portable: boolean;
};

export type UpdateCheck =
  | { status: 'unsupported' }
  | { status: 'upToDate' }
  | { status: 'available'; info: UpdateInfo };

let pending: Update | null = null;

export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!isTauri) return { status: 'unsupported' };
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
  if (!update) {
    pending = null;
    return { status: 'upToDate' };
  }
  pending = update;
  return {
    status: 'available',
    info: { version: update.version, portable: await isPortable() },
  };
}

/** `onProgress` receives 0–100, or null while the download size is unknown. */
export async function installUpdate(onProgress: (percent: number | null) => void): Promise<void> {
  if (!pending) throw new Error('Aucune mise à jour en attente — relancez la recherche.');
  let total = 0;
  let received = 0;
  await pending.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      total = event.data.contentLength ?? 0;
      onProgress(total ? 0 : null);
    } else if (event.event === 'Progress') {
      received += event.data.chunkLength;
      onProgress(total ? Math.min(100, Math.round((received / total) * 100)) : null);
    } else if (event.event === 'Finished') {
      onProgress(100);
    }
  });
}

export async function relaunchApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}
