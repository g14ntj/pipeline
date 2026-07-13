import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Users, Building2, Kanban, Inbox, FolderKanban, LogOut } from 'lucide-react';
import type { User } from '@/lib/api';
import { cn } from '@/lib/cn';
import { GridBackground } from '@/components/GridBackground';
import logoBanner from '@/assets/PhoenicianBannerLogo.png';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Kanban },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/triage', label: 'Triage', icon: Inbox },
];

export function Layout({ user, onLogout, children }: { user: User; onLogout: () => void; children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="relative min-h-screen bg-navy-deep text-paper">
      <GridBackground />
      <div className="relative z-10 flex min-h-screen">
        <aside className="flex w-60 shrink-0 flex-col border-r border-cerulean/20 bg-navy-deep/80 backdrop-blur-xl">
          <div className="border-b border-cerulean/20 p-5">
            <img src={logoBanner} alt="Phoenician" className="h-10 w-auto object-contain" />
            <h1 className="mt-3 font-display text-lg font-bold tracking-tight text-paper">Pipeline</h1>
            <p className="text-xs text-muted">Internal CRM</p>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'border border-cerulean/30 bg-cerulean/15 font-medium text-paper'
                      : 'text-muted hover:bg-white/5 hover:text-paper',
                  )}
                >
                  <Icon size={16} className={active ? 'text-cerulean' : undefined} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 border-t border-cerulean/20 p-4">
            {user.picture && <img src={user.picture} alt="" className="h-9 w-9 rounded-full border border-cerulean/30" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-paper">{user.name}</p>
              <p className="truncate text-[10px] text-muted">{user.email}</p>
            </div>
            <button onClick={onLogout} className="btn-ghost p-2" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </aside>
        <main className="custom-scrollbar flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
