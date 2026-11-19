'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileLines, RefreshCw } from '@/components/icons';

type BackupFile = {
  name: string;
  created_at: string | null;
  size: number | null;
};

function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null || !('name' in value)) return false;
  return typeof value.name === 'string'
    && (!('created_at' in value) || value.created_at === null || typeof value.created_at === 'string')
    && (!('size' in value) || value.size === null || typeof value.size === 'number');
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchBackups(): Promise<BackupFile[]> {
  const response = await fetch('/api/admin/backups', { cache: 'no-store' });
  const result: unknown = await response.json();
  const message = typeof result === 'object'
    && result !== null
    && 'error' in result
    && typeof result.error === 'string'
    ? result.error
    : 'Could not load database backups.';
  if (!response.ok) throw new Error(message);
  if (typeof result !== 'object' || result === null || !('backups' in result) || !Array.isArray(result.backups)) {
    throw new Error('The backup list returned an invalid response.');
  }
  if (!result.backups.every(isBackupFile)) throw new Error('The backup list returned an invalid file entry.');
  return result.backups;
}

export default function AdminBackupsPanel() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBackups(await fetchBackups());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load database backups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchBackups()
      .then((files) => {
        if (active) setBackups(files);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load database backups.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function createBackup() {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/backups', { method: 'POST' });
      const result: unknown = await response.json();
      const message = typeof result === 'object'
        && result !== null
        && 'error' in result
        && typeof result.error === 'string'
        ? result.error
        : 'Could not start a database backup.';
      if (!response.ok) throw new Error(message);
      const successMessage = typeof result === 'object'
        && result !== null
        && 'message' in result
        && typeof result.message === 'string'
        ? result.message
        : 'Backup started.';
      setNotice(successMessage);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not start a database backup.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className='admin-backups-content'>
      <div className='admin-backups-actions'>
        <button type='button' className='admin-backups-create' onClick={() => void createBackup()} disabled={creating}>
          <FileLines size={16} />
          {creating ? 'Starting backup…' : 'Create database backup'}
        </button>
        <button type='button' className='admin-backups-refresh' onClick={() => void loadBackups()} disabled={loading}>
          <RefreshCw size={15} />
          Refresh list
        </button>
      </div>
      {notice && <p className='admin-backups-notice' role='status'>{notice}</p>}
      {error && <p className='admin-backups-error' role='alert'>{error}</p>}

      <div className='admin-backups-list' aria-busy={loading}>
        {loading ? (
          <p className='admin-backups-empty' role='status'>Loading backup files…</p>
        ) : backups.length ? (
          backups.map((backup) => (
            <article className='admin-backup-row' key={backup.name}>
              <div>
                <strong>{backup.name}</strong>
                <span>
                  {backup.created_at
                    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(backup.created_at))
                    : 'Date unavailable'}
                  {' · '}{formatBytes(backup.size)}
                </span>
              </div>
              <a href={`/api/admin/backups/${encodeURIComponent(backup.name)}`} className='admin-backup-download'>
                <Download size={15} />
                Download SQL
              </a>
            </article>
          ))
        ) : (
          <p className='admin-backups-empty'>No backup files are available yet.</p>
        )}
      </div>
    </div>
  );
}
