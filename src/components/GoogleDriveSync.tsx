import React, { useState, useEffect } from 'react';
import { HardDrive, UploadCloud, CheckCircle2, Cloud, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface GoogleDriveSyncProps {
  stats: any;
}

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ stats }) => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check local storage for cached token
    const cachedToken = localStorage.getItem('genesis_gdrive_token');
    if (cachedToken) {
      setAccessToken(cachedToken);
    }
  }, []);

  const handleConnectGoogleDrive = () => {
    // Initiate Google Identity Services Token Client if available in window
    const gWindow = window as any;
    if (gWindow.google?.accounts?.oauth2) {
      const client = gWindow.google.accounts.oauth2.initTokenClient({
        client_id: '622667494717-3nf8ibgspnb196tooaajecnit6cfh3a3.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            localStorage.setItem('genesis_gdrive_token', tokenResponse.access_token);
            setSyncStatus('Connected to Google Drive');
          }
        },
      });
      client.requestAccessToken();
    } else {
      // Fallback: prompt for access token or OAuth confirmation
      const token = prompt('Enter Google Drive Access Token (or authorize via OAuth popup):');
      if (token) {
        setAccessToken(token);
        localStorage.setItem('genesis_gdrive_token', token);
        setSyncStatus('Token saved manually');
      }
    }
  };

  const handleSyncToDrive = async () => {
    if (!accessToken) {
      handleConnectGoogleDrive();
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Backing up state to Google Drive...');

    try {
      // Fetch full telemetry, benchmarks and memory to upload
      const memoryRes = await fetch('/api/memory').then(r => r.json()).catch(() => ({}));
      const taskRes = await fetch('/api/tasks').then(r => r.json()).catch(() => ({}));

      const backupContent = {
        app: 'Project Genesis AI Laboratory',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        stats,
        memoryGraph: memoryRes.graph || null,
        tasks: taskRes.tasks || [],
      };

      const fileMetadata = {
        name: `genesis_lab_backup_${Date.now()}.json`,
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(backupContent, null, 2)], { type: 'application/json' }));

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Google Drive API error: ${res.statusText}`);
      }

      const fileData = await res.json();
      setFileId(fileData.id);
      setSyncStatus(`Successfully backed up! File ID: ${fileData.id}`);
      fetchDriveBackups();
    } catch (err: any) {
      console.error(err);
      setSyncStatus(`Backup failed: ${err.message || 'Check access token/scopes'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchDriveBackups = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name+contains+'genesis_lab_backup'&fields=files(id,name,createdTime,mimeType,webViewLink)",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to list drive files:', err);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-zinc-900 text-sky-400 border border-sky-600/30 hover:bg-sky-950/40 hover:border-sky-500/60 transition-all shadow-sm"
        title="Sync and backup laboratory state directly to Google Drive"
      >
        <HardDrive className="w-3.5 h-3.5 text-sky-400" />
        Google Drive Sync
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-800">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Google Drive Workspace Integration</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Backup RLAIF checkpoints, benchmark logs & Knowledge Graph
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>

            {/* Auth status bar */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold">Authentication Status:</span>
                {accessToken ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authorized (OAuth Drive)
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Connected
                  </span>
                )}
              </div>

              {!accessToken ? (
                <button
                  onClick={handleConnectGoogleDrive}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
                >
                  Connect Google Drive Account
                </button>
              ) : (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                  <span className="text-[11px] text-zinc-500 truncate max-w-[240px]">
                    Token: {accessToken.slice(0, 12)}...
                  </span>
                  <button
                    onClick={() => {
                      setAccessToken('');
                      localStorage.removeItem('genesis_gdrive_token');
                    }}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Backup Action */}
            <div className="space-y-3">
              <button
                onClick={handleSyncToDrive}
                disabled={isSyncing}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-950 disabled:opacity-50 transition-all"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                {isSyncing ? 'Exporting to Google Drive...' : 'Export Current Lab State to Google Drive'}
              </button>

              {syncStatus && (
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300">
                  {syncStatus}
                </div>
              )}
            </div>

            {/* Recent Drive Backups List */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 font-bold">
                <span>Stored Backups on Drive:</span>
                <button
                  onClick={fetchDriveBackups}
                  className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {driveFiles.length > 0 ? (
                  driveFiles.map(f => (
                    <div
                      key={f.id}
                      className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg text-xs font-mono flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-zinc-200 truncate max-w-[200px]">{f.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(f.createdTime).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs font-mono text-zinc-600">
                    No Drive backups found yet.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
