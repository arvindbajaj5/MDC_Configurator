export const DEFAULT_GOOGLE_CLIENT_ID =
  '941977076757-tknvrhuu59prsnu3lrb7gms61012vcld.apps.googleusercontent.com';
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface DriveItem {
  id: string;
  name: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface DriveFolderCrumb {
  id: string;
  name: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export function isProtectedMasterFile(fileName = ''): boolean {
  return /master_catalog|supply_intel/i.test(fileName);
}

export function requestDriveAccessToken(
  clientId: string,
  onToken: (token: string) => void,
  onError?: (msg: string) => void
): void {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    onError?.('Google Identity Services script is still loading or blocked offline.');
    return;
  }
  const tokenClient = oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: resp => {
      if (resp.access_token) onToken(resp.access_token);
      else onError?.(resp.error || 'Google Drive sign-in cancelled.');
    }
  });
  tokenClient.requestAccessToken();
}

export async function listDriveFolderContents(
  token: string,
  folderId: string
): Promise<{ folders: DriveItem[]; files: DriveItem[] }> {
  const qFolder = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const qFiles = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
  const headers = { Authorization: `Bearer ${token}` };

  const [resF, resJ] = await Promise.all([
    fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qFolder)}&orderBy=name&fields=files(id,name)`, { headers }),
    fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qFiles)}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`, { headers })
  ]);
  const dataF = await resF.json();
  const dataJ = await resJ.json();
  return {
    folders: Array.isArray(dataF.files) ? dataF.files : [],
    files: Array.isArray(dataJ.files) ? dataJ.files : []
  };
}

export async function listRecentFoldersAndJson(
  token: string
): Promise<{ recentFolders: DriveItem[]; recentJson: DriveItem[] }> {
  const headers = { Authorization: `Bearer ${token}` };
  const qFolders = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  const qJson = "mimeType='application/json' and trashed=false";
  const [rF, rJ] = await Promise.all([
    fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qFolders)}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,modifiedTime,parents)`, { headers }),
    fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qJson)}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,modifiedTime,parents)`, { headers })
  ]);
  const dF = await rF.json();
  const dJ = await rJ.json();
  return {
    recentFolders: Array.isArray(dF.files) ? dF.files : [],
    recentJson: Array.isArray(dJ.files) ? dJ.files : []
  };
}

export async function searchDriveFolders(token: string, query: string): Promise<DriveItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const q = `mimeType='application/vnd.google-apps.folder' and name contains '${trimmed.replace(/'/g, "\\'")}' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=20&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function createDriveFolder(token: string, name: string, parentId: string): Promise<boolean> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  return res.ok;
}

export async function uploadJsonToDriveFolder(
  token: string,
  folderId: string,
  fileName: string,
  payload: unknown
): Promise<boolean> {
  const meta = { name: fileName, mimeType: 'application/json', parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  return res.ok;
}

export async function downloadDriveJsonFile(token: string, fileId: string): Promise<unknown> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function trashDriveFile(token: string, fileId: string, fileName: string): Promise<boolean> {
  if (isProtectedMasterFile(fileName)) {
    throw new Error(`Protected master file "${fileName}" cannot be deleted from Deal Hub.`);
  }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true })
  });
  return res.ok;
}
