import { Suspense } from 'react';
import { FileLines } from '@/components/icons';
import { requireStaff } from '@/lib/auth';
import AdminBackupsPanel from './AdminBackupsPanel';
import AdminLoading from '../loading';

export default function AdminBackupsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminBackupsContent />
    </Suspense>
  );
}

async function AdminBackupsContent() {
  await requireStaff();

  return (
    <div className='admin-queue-page admin-backups-page'>
      <header className='admin-queue-heading'>
        <div>
          <h1>Database backups</h1>
          <p>Create a SQL snapshot or download a previous backup.</p>
        </div>
      </header>

      <section className='admin-backups-panel' aria-labelledby='admin-backups-title'>
        <div className='admin-backups-panel-heading'>
          <span aria-hidden='true'><FileLines size={20} /></span>
          <div>
            <h2 id='admin-backups-title'>PostgreSQL snapshots</h2>
            <p>Backups contain sensitive marketplace and account data. Download them only to an approved secure location.</p>
          </div>
        </div>
        <AdminBackupsPanel />
      </section>
    </div>
  );
}
