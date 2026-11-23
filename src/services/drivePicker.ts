/**
 * Real Google Drive Picker & REST v3 Integration (Bug #2 Fix).
 * - Uses Google Identity Services (GIS) OAuth 2.0 token client.
 * - Opens native Google Picker API (`google.picker.DocsView(ViewId.FOLDERS)`)
 *   with `setIncludeFolders(true)`, `setSelectFolderEnabled(true)`, and `SUPPORT_DRIVES`
 *   so users can drill down into ANY real folder or Shared Drive — never stuck on My Drive.
 * - Surfaces real Drive API / OAuth errors via typed `DriveApiError` instead of silent catches.
 */

export interface DriveEnvConfig {
  clientId: string;
  apiKey: string;
  appId: string;
}

export interface DrivePickedItem {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  parentId?: string;
}

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

export class DriveApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly remediationHint: string;

  constructor(code: string, message: string, remediationHint: string, status?: number) {
    super(message);
    this.name = 'DriveApiError';
    this.code = code;
    this.status = status;
    this.remediationHint = remediationHint;
  }
}

export const DRIVE_SCOPE_FILE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_SCOPE_READONLY = 'https://www.googleapis.com/auth/drive.readonly';

export function getDriveEnvConfig(): DriveEnvConfig {
  return {
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim(),
    apiKey: (import.meta.env.VITE_GOOGLE_PICKER_API_KEY || '').trim(),
    appId: (import.meta.env.VITE_GOOGLE_APP_ID || '').trim()
  };
}

export function isDriveConfigured(cfg: DriveEnvConfig = getDriveEnvConfig()): boolean {
  return Boolean(cfg.clientId && cfg.apiKey);
}

const loadedScripts = new Set<string>();

function loadExternalScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      loadedScripts.add(src);
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () =>
      reject(
        new DriveApiError(
          'SCRIPT_LOAD_FAILED',
          `Failed to load Google script: ${src}`,
          'Verify internet connectivity and ensure ad-blockers are not blocking accounts.google.com or apis.google.com.'
        )
      );
    document.head.appendChild(script);
  });
}

async function ensurePickerApiLoaded(): Promise<void> {
  await loadExternalScript('https://apis.google.com/js/api.js');
  if (typeof gapi === 'undefined') {
    throw new DriveApiError(
      'GAPI_UNAVAILABLE',
      'Google API client (gapi) did not initialize.',
      'Reload the page or disable strict tracking protection for apis.google.com.'
    );
  }
  await new Promise<void>((resolve, reject) => {
    gapi.load('picker', {
      callback: () => resolve(),
      onerror: (err) =>
        reject(
          new DriveApiError(
            'PICKER_LOAD_ERROR',
            `Google Picker module failed to load: ${String(err)}`,
            'Confirm Google Picker API is enabled in your Google Cloud Console project.'
          )
        )
    });
  });
}

/**
 * Requests a live OAuth 2.0 access token via Google Identity Services.
 */
export async function requestGoogleAccessToken(
  includeReadonlyScope = true,
  cfg: DriveEnvConfig = getDriveEnvConfig()
): Promise<string> {
  if (!cfg.clientId) {
    throw new DriveApiError(
      'MISSING_CLIENT_ID',
      'VITE_GOOGLE_CLIENT_ID is not configured.',
      'Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_PICKER_API_KEY in GitHub Repo Settings -> Actions -> Variables (or .env.local).'
    );
  }

  await loadExternalScript('https://accounts.google.com/gsi/client');

  const scope = includeReadonlyScope
    ? `${DRIVE_SCOPE_FILE} ${DRIVE_SCOPE_READONLY}`
    : DRIVE_SCOPE_FILE;

  return new Promise<string>((resolve, reject) => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope,
        prompt: '',
        callback: (resp) => {
          if (resp.error) {
            reject(
              new DriveApiError(
                resp.error,
                resp.error_description || `OAuth error: ${resp.error}`,
                'Ensure this origin is listed under Authorized JavaScript Origins in Google Cloud Console OAuth Client settings.'
              )
            );
            return;
          }
          if (!resp.access_token) {
            reject(
              new DriveApiError(
                'EMPTY_ACCESS_TOKEN',
                'Google OAuth completed without returning an access token.',
                'Retry sign-in and accept Google Drive permissions.'
              )
            );
            return;
          }
          resolve(resp.access_token);
        },
        error_callback: (err) => {
          reject(
            new DriveApiError(
              err.type || 'OAUTH_POPUP_ERROR',
              err.message || `Google sign-in interrupted (${err.type}).`,
              'Allow popups for this site and retry Google Drive sign-in.'
            )
          );
        }
      });

      tokenClient.requestAccessToken({ scope });
    } catch (err) {
      reject(
        new DriveApiError(
          'GIS_INIT_FAILED',
          err instanceof Error ? err.message : String(err),
          'Verify your OAuth Client ID format (*.apps.googleusercontent.com).'
        )
      );
    }
  });
}

/**
 * Opens the official Google Picker modal configured for full folder drill-down
 * across My Drive and Shared Drives (supports selecting ANY nested folder).
 */
export async function openGoogleFolderPicker(
  accessToken: string,
  cfg: DriveEnvConfig = getDriveEnvConfig()
): Promise<DrivePickedItem | null> {
  if (!cfg.apiKey) {
    throw new DriveApiError(
      'MISSING_PICKER_API_KEY',
      'VITE_GOOGLE_PICKER_API_KEY is not configured.',
      'Create an HTTP-referrer-restricted API Key in Google Cloud Console with Google Picker API enabled.'
    );
  }

  await ensurePickerApiLoaded();

  return new Promise<DrivePickedItem | null>((resolve, reject) => {
    try {
      const folderView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder');

      const builder = new google.picker.PickerBuilder()
        .setTitle('Select Target Folder for MDC Deals & Catalogs')
        .addView(folderView)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(accessToken)
        .setDeveloperKey(cfg.apiKey)
        .setOrigin(window.location.origin)
        .setCallback((data) => {
          if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (data.action === google.picker.Action.PICKED && data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            resolve({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url,
              parentId: doc.parentId
            });
          }
        });

      if (cfg.appId) {
        builder.setAppId(cfg.appId);
      }

      builder.build().setVisible(true);
    } catch (err) {
      reject(
        new DriveApiError(
          'PICKER_OPEN_FAILED',
          err instanceof Error ? err.message : String(err),
          'Verify Google Picker API is enabled and your API Key allows this referrer origin.'
        )
      );
    }
  });
}

/**
 * Opens Google Picker to pick an existing MDC Deal / Catalog JSON file from Drive.
 */
export async function openGoogleJsonFilePicker(
  accessToken: string,
  cfg: DriveEnvConfig = getDriveEnvConfig()
): Promise<DrivePickedItem | null> {
  if (!cfg.apiKey) {
    throw new DriveApiError(
      'MISSING_PICKER_API_KEY',
      'VITE_GOOGLE_PICKER_API_KEY is not configured.',
      'Set VITE_GOOGLE_PICKER_API_KEY to enable file picking.'
    );
  }
  await ensurePickerApiLoaded();

  return new Promise<DrivePickedItem | null>((resolve, reject) => {
    try {
      const jsonView = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setMimeTypes('application/json,text/plain');

      const builder = new google.picker.PickerBuilder()
        .setTitle('Open Saved MDC Deal or Catalog (.json)')
        .addView(jsonView)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(accessToken)
        .setDeveloperKey(cfg.apiKey)
        .setOrigin(window.location.origin)
        .setCallback((data) => {
          if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (data.action === google.picker.Action.PICKED && data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            resolve({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url,
              parentId: doc.parentId
            });
          }
        });

      if (cfg.appId) builder.setAppId(cfg.appId);
      builder.build().setVisible(true);
    } catch (err) {
      reject(
        new DriveApiError(
          'JSON_PICKER_FAILED',
          err instanceof Error ? err.message : String(err),
          'Confirm Google Picker API is enabled in GCP.'
        )
      );
    }
  });
}

async function parseDriveError(resp: Response, context: string): Promise<DriveApiError> {
  let detail = resp.statusText;
  let reason = `HTTP_${resp.status}`;
  try {
    const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(payload, null, 2)}\r\n` +
    `--${boundary}--`;

  const uploadUrl = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime&supportsAllDrives=true`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime&supportsAllDrives=true`;

  const resp = await fetch(uploadUrl, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!resp.ok) {
    throw await parseDriveError(resp, `Failed to save ${safeName} to Google Drive`);
  }
  return (await resp.json()) as DriveFileSummary;
}

/**
 * Downloads and parses a JSON file by Drive File ID.
 */
export async function loadJsonFromDriveFile(
  accessToken: string,
  fileId: string
): Promise<unknown> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) {
    throw await parseDriveError(resp, 'Failed to download JSON file from Google Drive');
  }
  return resp.json();
}
