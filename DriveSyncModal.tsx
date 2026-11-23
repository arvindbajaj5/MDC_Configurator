import React, { useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Save,
  Upload,
  X
} from 'lucide-react';
import {
  createDriveSubfolder,
  DriveApiError,
  type DriveFileSummary,
  isDriveConfigured,
  listDriveFolderContents,
  loadJsonFromDriveFile,
  openGoogleFolderPicker,
  openGoogleJsonFilePicker,
  requestGoogleAccessToken,
  saveJsonToDriveFolder
} from '../../services/drivePicker';
import type { DealConfig } from '../../types/schema';

interface DriveSyncModalProps {
  open: boolean;
  onClose: () => void;
  activeDeal: DealConfig;
  selectedFolderId: string | null;
  selectedFolderPath: string;
  includeReadonlyScope: boolean;
  onUpdateDriveConfig: (patch: {
    selectedFolderId?: string | null;
    selectedFolderPath?: string;
    includeReadonlyScope?: boolean;
  }) => void;
  onImportPayloadFromDrive: (payload: unknown, filename: string) => void;
  onNotify: (tone: 'success' | 'error' | 'info' | 'warning', title: string, detail?: string) => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  open,
  onClose,
  activeDeal,
  selectedFolderId,
  selectedFolderPath,
  includeReadonlyScope,
  onUpdateDriveConfig,
  onImportPayloadFromDrive,
  onNotify
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contents, setContents] = useState<DriveFileSummary[]>([]);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [apiError, setApiError] = useState<{ code: string; message: string; hint: string } | null>(null);

  if (!open) return null;

  const configured = isDriveConfigured();

  const handleError = (err: unknown) => {
    if (err instanceof DriveApiError) {
      setApiError({ code: err.code, message: err.message, hint: err.remediationHint });
      onNotify('error', `Google Drive Error (${err.code})`, err.message);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      setApiError({
        code: 'UNEXPECTED_ERROR',
        message: msg,
        hint: 'Check browser console and retry.'
      });
      onNotify('error', 'Google Drive Operation Failed', msg);
    }
  };

  const ensureToken = async (): Promise<string> => {
    if (accessToken) return accessToken;
    const token = await requestGoogleAccessToken(includeReadonlyScope);
    setAccessToken(token);
    return token;
  };

  const handleConnect = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const token = await requestGoogleAccessToken(includeReadonlyScope);
      setAccessToken(token);
      onNotify('success', 'Connected to Google Drive', 'Use "Pick Any Folder" to select your target Drive folder.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handlePickFolder = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const token = await ensureToken();
      const picked = await openGoogleFolderPicker(token);
      if (!picked) return;
      onUpdateDriveConfig({
        selectedFolderId: picked.id,
        selectedFolderPath: picked.name
      });
      const files = await listDriveFolderContents(token, picked.id);
      setContents(files);
      onNotify('success', `Target Folder Selected: ${picked.name}`, `Folder ID: ${picked.id}`);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshContents = async () => {
    if (!selectedFolderId) return;
    setBusy(true);
    setApiError(null);
    try {
      const token = await ensureToken();
      const files = await listDriveFolderContents(token, selectedFolderId);
      setContents(files);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName.trim()) return;
    setBusy(true);
    setApiError(null);
    try {
      const token = await ensureToken();
      const created = await createDriveSubfolder(token, selectedFolderId, newSubfolderName);
      onUpdateDriveConfig({
        selectedFolderId: created.id,
        selectedFolderPath: `${selectedFolderPath} / ${created.name}`
      });
      setNewSubfolderName('');
      const files = await listDriveFolderContents(token, created.id);
      setContents(files);
      onNotify('success', `Created Folder "${created.name}"`, 'Now set as active Drive sync destination.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveActiveDeal = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const token = await ensureToken();
      const slug = activeDeal.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const filename = `${slug || activeDeal.id}.json`;
      const saved = await saveJsonToDriveFolder(token, selectedFolderId, filename, activeDeal);
      onNotify('success', `Saved to Drive: ${saved.name}`, `Target: ${selectedFolderPath}`);
      if (selectedFolderId) {
        const files = await listDriveFolderContents(token, selectedFolderId);
        setContents(files);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenJsonFromPicker = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const token = await ensureToken();
      const picked = await openGoogleJsonFilePicker(token);
      if (!picked) return;
      const payload = await loadJsonFromDriveFile(token, picked.id);
      onImportPayloadFromDrive(payload, picked.name);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white border border-slate-300 rounded-md w-full max-w-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-brand-navy text-white">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-brand-orange" />
            <h2 className="text-sm font-bold tracking-tight">Google Drive Picker & Sync (Live API v3)</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded-cad">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {!configured && (
            <div className="border border-amber-300 bg-amber-50 rounded-cad p-3 text-amber-950">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Google Cloud Credentials Not Set in Build Environment
              </p>
              <p className="mt-1 leading-relaxed text-[11px]">
                Add <code className="font-mono bg-amber-100 px-1">VITE_GOOGLE_CLIENT_ID</code> and{' '}
                <code className="font-mono bg-amber-100 px-1">VITE_GOOGLE_PICKER_API_KEY</code> in{' '}
                <strong>GitHub Repo Settings → Secrets and variables → Actions → Variables</strong> (or{' '}
                <code className="font-mono">.env.local</code> locally) and enable both{' '}
                <strong>Google Drive API</strong> and <strong>Google Picker API</strong> in GCP.
              </p>
            </div>
          )}

          {apiError && (
            <div className="border border-red-300 bg-red-50 rounded-cad p-3 text-red-950">
              <p className="font-semibold font-mono text-[11px]">ERROR [{apiError.code}]</p>
              <p className="mt-0.5 text-xs">{apiError.message}</p>
              <p className="mt-1 text-[11px] text-red-800">
                <strong>Fix:</strong> {apiError.hint}
              </p>
            </div>
          )}

          <div className="border border-slate-200 rounded-cad p-3 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Active Target Drive Folder
              </p>
              <p className="font-mono text-xs font-semibold text-brand-navy mt-0.5">
                {selectedFolderPath} {selectedFolderId ? `(${selectedFolderId.slice(0, 10)}…)` : '(Root)'}
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReadonlyScope}
                onChange={(e) => onUpdateDriveConfig({ includeReadonlyScope: e.target.checked })}
                className="accent-brand-orange"
              />
              Include <code className="font-mono">drive.readonly</code> (full folder browse)
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleConnect}
              className="px-2.5 py-2 border border-slate-300 rounded-cad bg-white hover:bg-slate-50 font-semibold text-slate-800 disabled:opacity-50"
            >
              {accessToken ? 'Reconnect OAuth' : '1. Sign In'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handlePickFolder}
              className="px-2.5 py-2 rounded-cad bg-brand-navy text-white hover:bg-brand-navy/90 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Pick Any Folder
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveActiveDeal}
              className="px-2.5 py-2 rounded-cad bg-brand-orange text-white hover:bg-brand-orange/90 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Deal JSON
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleOpenJsonFromPicker}
              className="px-2.5 py-2 border border-brand-navy text-brand-navy rounded-cad bg-white hover:bg-slate-50 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Open JSON
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              placeholder="Create new subfolder inside selected folder..."
              className="flex-1 border border-slate-300 rounded-cad px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              disabled={busy || !newSubfolderName.trim()}
              onClick={handleCreateSubfolder}
              className="px-3 py-1.5 border border-slate-300 rounded-cad bg-slate-100 hover:bg-slate-200 font-semibold text-slate-800 flex items-center gap-1 disabled:opacity-50"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Create
            </button>
            {selectedFolderId && (
              <button
                type="button"
                disabled={busy}
                onClick={handleRefreshContents}
                className="px-2.5 py-1.5 border border-slate-300 rounded-cad bg-white hover:bg-slate-50"
                title="Refresh folder contents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {contents.length > 0 && (
            <div className="border border-slate-200 rounded-cad max-h-40 overflow-y-auto divide-y divide-slate-100">
              {contents.map((item) => (
                <div key={item.id} className="px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-mono truncate">{item.name}</span>
                  <span className="text-slate-400 shrink-0 ml-2">
                    {item.mimeType.includes('folder') ? 'Folder' : 'JSON'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
