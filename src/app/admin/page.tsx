import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Shield, Flag, Laptop, Users, AlertTriangle } from 'lucide-react';

export default async function AdminDashboardPage() {
  const { supabase } = await requireStaff();

  // Quick counts
  const [openReports, pendingAlerts, totalListings, totalUsers] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  const cards = [
    {
      title: 'Report Queue',
      count: openReports.count || 0,
      label: 'Open reports to review',
      href: '/admin/reports',
      icon: Flag,
      color: 'text-red-700 bg-red-50 border-red-200',
    },
    {
      title: 'Chat Alerts',
      count: pendingAlerts.count || 0,
      label: 'Scam phrases flagged in chat',
      href: '/admin/alerts',
      icon: AlertTriangle,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Manage Listings',
      count: totalListings.count || 0,
      label: 'Active & published laptops',
      href: '/admin/listings',
      icon: Laptop,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Manage Users',
      count: totalUsers.count || 0,
      label: 'Registered marketplace members',
      href: '/admin/users',
      icon: Users,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
  ];

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2'>
        <Shield size={24} className='text-emerald-700' />
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Moderation & Admin Hub</h1>
          <p className='text-sm text-gray-500'>Marketplace moderation, scam review, and user management.</p>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${c.color}`}
            >
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wider'>{c.title}</span>
                <Icon size={20} />
              </div>
              <p className='mt-3 text-3xl font-extrabold text-gray-900'>{c.count}</p>
              <p className='mt-1 text-xs text-gray-600'>{c.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
