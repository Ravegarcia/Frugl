import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

const STORAGE_BUCKET = 'admin-backups';
const PAGE_SIZE = 100;
const MAX_BACKUPS = 5000;

async function requireAdministrator() {
  const { user, profile } = await apiUser();
  if (!user) return { error: json({ error: 'Please sign in.' }, 401) };
  if (profile?.status !== 'active' || profile.role !== 'admin') {
    return { error: json({ error: 'Administrator access is required.' }, 403) };
  }
  return { user };
}

export async function GET() {
  const authorization = await requireAdministrator();
  if ('error' in authorization) return authorization.error;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize database backup access:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Database backups are temporarily unavailable.' }, 503);
  }

  const files: Array<{ name: string; created_at: string | null; size: number | null }> = [];
  for (let offset = 0; offset < MAX_BACKUPS; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('Could not list database backups:', error.message);
      return json({ error: 'Could not load database backups.' }, 500);
    }

    const page = (data ?? [])
      .filter((file) => file.name.endsWith('.sql'))
      .map((file) => ({
        name: file.name,
        created_at: file.created_at ?? null,
        size: typeof file.metadata?.size === 'number' ? file.metadata.size : null,
      }));
    files.push(...page);
    if (!data || data.length < PAGE_SIZE) break;
  }

  files.sort((first, second) =>
    (second.created_at ?? '').localeCompare(first.created_at ?? ''),
  );
  return json({ backups: files });
}

export async function POST() {
  const authorization = await requireAdministrator();
  if ('error' in authorization) return authorization.error;

  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_BACKUP_REF || 'main';
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    return json({ error: 'Configure GITHUB_ACTIONS_TOKEN and GITHUB_REPOSITORY to enable backups.' }, 503);
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/database-backup.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref }),
        cache: 'no-store',
      },
    );
  } catch (error) {
    console.error('Could not start database backup workflow:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not contact the backup runner. Please try again.' }, 502);
  }

  if (!response.ok) {
    console.error(`GitHub rejected database backup dispatch with status ${response.status}.`);
    return json({ error: 'The backup runner rejected the request. Check its GitHub configuration.' }, 502);
  }

  return json({ ok: true, message: 'Backup started. It will appear here when the workflow finishes.' }, 202);
}
