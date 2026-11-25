import React, { useEffect, useState } from 'react';
import {
  createDriveFolder,
  downloadDriveJsonFile,
  isProtectedMasterFile,
  listDriveFolderContents,
  listRecentFoldersAndJson,
  searchDriveFolders,
  trashDriveFile,
  uploadJsonToDriveFolder,
  type DriveFolderCrumb,
  type DriveItem
} from '../engine/drivePicker';
import { saveFilesToLocalDirectory } from '../engine/storageAdapter';
import type { ContainerSpec, MasterStandards, NonItCatalogItem, ProjectDeal, RackSku } from '../types/mdc';

interface WorkspaceSaveOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'open';
  currentProject: ProjectDeal;
  skus: RackSku[];
  containerCatalog: ContainerSpec[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  driveToken: string;
  onGoogleSignIn: () => void;
  onImportLocalFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadedRemoteObject: (obj: unknown, fileName: string) => void;
  onDriveSyncStatus: (msg: string) => void;
}

export const WorkspaceSaveOpenModal: React.FC<WorkspaceSaveOpenModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentProject,
  skus,
  containerCatalog,
  nonItCatalog,
  standards,
  driveToken,
  onGoogleSignIn,
  onImportLocalFile,
  onLoadedRemoteObject,
  onDriveSyncStatus
}) => {
  const defaultFileName = `MDC_Deal_${(currentProject?.name || 'Project').replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`;
  const [targetFileName, setTargetFileName] = useState(defaultFileName);
  const [includeMasterBackup, setIncludeMasterBackup] = useState(false);
  const [localStatus, setLocalStatus] = useState('');

  const [folderStack, setFolderStack] = useState<DriveFolderCrumb[]>([{ id: 'root', name: 'My Drive' }]);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [recentFolders, setRecentFolders] = useState<DriveItem[]>([]);
  const [recentJson, setRecentJson] = useState<DriveItem[]>([]);
  const [folderSearch, setFolderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<DriveItem[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [loadingDrive, setLoadingDrive] = useState(false);

  useEffect(() => {
    setTargetFileName(`MDC_Deal_${(currentProject?.name || 'Project').replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`);
    setLocalStatus('');
  }, [currentProject?.id, currentProject?.name, isOpen]);

  const loadFolder = async (folderId: string) => {
    if (!driveToken) return;
    setLoadingDrive(true);
    try {
      const res = await listDriveFolderContents(driveToken, folderId);
      setFolders(res.folders);
      setFiles(res.files);
    } catch {
      // Ignore transient network errors
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !driveToken) return;
    setFolderStack([{ id: 'root', name: 'My Drive' }]);
    loadFolder('root');
    listRecentFoldersAndJson(driveToken)
      .then(res => {
        setRecentFolders(res.recentFolders);
        setRecentJson(res.recentJson);
      })
      .catch(() => {});
  }, [isOpen, driveToken]);

  if (!isOpen) return null;

  const folderPathLabel = folderStack.map(f => f.name).join(' / ');

  const handleLocalSave = async () => {
    const safeName = (targetFileName || defaultFileName).trim().replace(/[^a-zA-Z0-9_.-]+/g, '_');
    const finalName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
    const payloadFiles = [{ name: finalName, content: JSON.stringify(currentProject, null, 2) }];
    if (includeMasterBackup) {
      payloadFiles.push({
        name: 'mdc_master_catalog.json',
        content: JSON.stringify({ skus, containerCatalog, nonItCatalog, standards, exportedAt: new Date().toISOString() }, null, 2)
      });
    }
    try {
      const res = await saveFilesToLocalDirectory(payloadFiles);
      setLocalStatus(`✓ Saved "${finalName}" into "${res.folderName}"`);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setLocalStatus('Save cancelled or blocked by browser.');
      }
    }
  };

  const handleFolderSearch = async (q: string) => {
    setFolderSearch(q);
    if (!q.trim() || !driveToken) {
      setSearchResults([]);
      return;
    }
    try {
      const matches = await searchDriveFolders(driveToken, q);
      setSearchResults(matches);
    } catch {
      setSearchResults([]);
    }
  };

  const jumpToFolder = async (folder: DriveItem) => {
    setFolderStack([
      { id: 'root', name: 'My Drive' },
      { id: folder.id, name: folder.name }
    ]);
    setFolderSearch('');
    setSearchResults([]);
    await loadFolder(folder.id);
  };

  const handleCreateSubfolder = async () => {
    if (!newFolderName.trim() || !driveToken) return;
    const parentId = folderStack[folderStack.length - 1].id;
    const ok = await createDriveFolder(driveToken, newFolderName, parentId);
    if (ok) {
      setNewFolderName('');
      await loadFolder(parentId);
    }
  };

  const handleDriveSave = async () => {
    if (!driveToken) return;
    const targetFolder = folderStack[folderStack.length - 1];
    const safeBase = (targetFileName || defaultFileName).trim().replace(/[^a-zA-Z0-9_.-]+/g, '_');
    const finalDealName = safeBase.endsWith('.json') ? safeBase : `${safeBase}.json`;
    onDriveSyncStatus('Saving...');
    const okDeal = await uploadJsonToDriveFolder(driveToken, targetFolder.id, finalDealName, currentProject);
    let okMaster = true;
    if (includeMasterBackup) {
      okMaster = await uploadJsonToDriveFolder(driveToken, targetFolder.id, 'mdc_master_catalog.json', {
        skus,
        containerCatalog,
        nonItCatalog,
        standards,
        exportedAt: new Date().toISOString()
      });
    }
    if (okDeal && okMaster) {
      onDriveSyncStatus(`Saved in ${targetFolder.name} ✓`);
      onClose();
    } else {
      onDriveSyncStatus('Drive Save Error');
    }
  };

  const handleDriveOpen = async (file: DriveItem) => {
    if (!driveToken) return;
    try {
      const obj = await downloadDriveJsonFile(driveToken, file.id);
      onLoadedRemoteObject(obj, file.name);
      onClose();
    } catch {
      alert('Failed to download JSON file from Google Drive.');
    }
  };

  const handleDriveTrash = async (file: DriveItem) => {
    if (!driveToken || isProtectedMasterFile(file.name)) return;
    if (!confirm(`Move "${file.name}" to Google Drive Trash?`)) return;
    try {
      const ok = await trashDriveFile(driveToken, file.id, file.name);
      if (ok) {
        await loadFolder(folderStack[folderStack.length - 1].id);
        setRecentJson(prev => prev.filter(f => f.id !== file.id));
      }
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Could not delete file.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 font-black uppercase text-[10px]">
              Deal Hub Storage & Master Catalog Protection
            </span>
            <h3 className="text-base font-bold navy-text mt-1">
              {mode === 'save'
                ? 'Save Deal JSON to Local Folder or Google Drive'
                : 'Open Deal or Master Catalog from Local Folder or Google Drive'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 font-bold text-base">
            ✕
          </button>
        </div>

        {mode === 'save' && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
            <label className="block font-bold navy-text">Target Deal File Name (.json)</label>
            <input
              type="text"
              value={targetFileName}
              onChange={e => setTargetFileName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-mono font-bold navy-text"
            />
            <label className="flex items-center gap-2 text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={includeMasterBackup}
                onChange={e => setIncludeMasterBackup(e.target.checked)}
                className="w-4 h-4"
              />
              <span>
                Also export a read-only backup copy of <code>mdc_master_catalog.json</code>
              </span>
            </label>
          </div>
        )}

        {/* 1. Local Folder Picker */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold navy-text text-sm">1. Local Computer / Device Folder</div>
              <div className="text-slate-500">Pick an exact local directory to save or load your deal JSON.</div>
            </div>
            {mode === 'save' ? (
              <button onClick={handleLocalSave} className="px-4 py-2 rounded-lg navy-bg text-white font-bold">
                📁 Choose Local Folder & Save
              </button>
            ) : (
              <label className="px-4 py-2 rounded-lg navy-bg text-white font-bold cursor-pointer">
                📂 Browse Local .JSON File
                <input
                  type="file"
                  accept=".json"
                  onChange={e => {
                    onImportLocalFile(e);
                    onClose();
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {localStatus && (
            <div className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded">
              {localStatus}
            </div>
          )}
        </div>

        {/* 2. Google Drive Folder Picker */}
        <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold navy-text text-sm">2. Google Drive Folder Picker (Master Files Protected)</div>
              <div className="text-slate-700 font-medium">
                {driveToken ? `Location: ${folderPathLabel}` : 'Connect Google Drive to browse or create folders.'}
              </div>
            </div>
            {!driveToken && (
              <button onClick={onGoogleSignIn} className="px-4 py-2 rounded-lg coral-bg text-white font-bold">
                ☁ Connect Google Drive
              </button>
            )}
          </div>

          {driveToken && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  {folderStack.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <span className="text-slate-400">/</span>}
                      <button
                        onClick={() => {
                          const next = folderStack.slice(0, idx + 1);
                          setFolderStack(next);
                          loadFolder(crumb.id);
                        }}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          idx === folderStack.length - 1 ? 'navy-bg text-white' : 'hover:bg-slate-100 navy-text'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                {folderStack.length > 1 && (
                  <button
                    onClick={() => {
                      const next = folderStack.slice(0, -1);
                      setFolderStack(next);
                      loadFolder(next[next.length - 1].id);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-bold"
                  >
                    ↑ Back
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Search Google Drive folder by name..."
                  value={folderSearch}
                  onChange={e => handleFolderSearch(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New subfolder name..."
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                  <button onClick={handleCreateSubfolder} className="px-3 py-1.5 rounded-lg navy-bg text-white font-bold">
                    + Folder
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 space-y-1">
                  <div className="font-bold text-amber-950 text-[11px]">Matching Folders:</div>
                  {searchResults.map(f => (
                    <div
                      key={f.id}
                      onClick={() => jumpToFolder(f)}
                      className="cursor-pointer flex items-center justify-between p-1.5 rounded bg-white hover:bg-blue-50 border border-amber-200"
                    >
                      <span className="font-bold navy-text">📁 {f.name}</span>
                      <span className="text-blue-700 font-bold">Select →</span>
                    </div>
                  ))}
                </div>
              )}

              {recentFolders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {recentFolders.slice(0, 10).map(rf => (
                    <button
                      key={rf.id}
                      onClick={() => jumpToFolder(rf)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-blue-600 font-semibold navy-text text-[11px]"
                    >
                      📁 {rf.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                {loadingDrive && <div className="text-center text-slate-400 py-2">Loading Drive folder...</div>}
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
                      loadFolder(folder.id);
                    }}
                    className="cursor-pointer flex items-center justify-between p-1.5 rounded hover:bg-blue-50"
                  >
                    <span className="font-bold navy-text">📁 {folder.name}</span>
                    <span className="text-slate-400">Open →</span>
                  </div>
                ))}
                {files.map(file => {
                  const protectedMaster = isProtectedMasterFile(file.name);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-800 truncate">
                        {protectedMaster ? '🔒' : '📄'} {file.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {mode === 'open' && (
                          <button
                            onClick={() => handleDriveOpen(file)}
                            className="px-2.5 py-0.5 rounded navy-bg text-white font-bold"
                          >
                            Open
                          </button>
                        )}
                        {protectedMaster ? (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold">
                            Protected Master
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDriveTrash(file)}
                            className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold"
                            title="Delete Deal File"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!loadingDrive && folders.length === 0 && files.length === 0 && (
                  <div className="text-center text-slate-400 py-3">
                    No subfolders or .json files inside "{folderStack[folderStack.length - 1].name}".
                  </div>
                )}
              </div>

              {mode === 'open' && recentJson.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-600">Recent .JSON Files Across Google Drive:</div>
                  <div className="max-h-28 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                    {recentJson.map(jf => {
                      const protectedMaster = isProtectedMasterFile(jf.name);
                      return (
                        <div key={jf.id} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-slate-50">
                          <span className="truncate font-medium text-slate-800">
                            {protectedMaster ? '🔒' : '📄'} {jf.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDriveOpen(jf)}
                              className="px-2.5 py-0.5 rounded navy-bg text-white font-bold"
                            >
                              Open
                            </button>
                            {!protectedMaster && (
                              <button
                                onClick={() => handleDriveTrash(jf)}
                                className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === 'save' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200">
                  <span className="text-[11px] text-slate-600">
                    Destination: <strong>{folderPathLabel}/{targetFileName}</strong>
                  </span>
                  <button onClick={handleDriveSave} className="px-4 py-2 rounded-lg coral-bg text-white font-bold">
                    ☁ Confirm & Save to "{folderStack[folderStack.length - 1].name}"
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
