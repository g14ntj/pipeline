import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Users, Building2, Kanban, Inbox, FolderKanban, LogOut } from 'lucide-react';
import type { User } from '@/lib/api';

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
    <div className="min-h-screen flex">
      <aside className="w-56 bg-[var(--brand)] text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">Pipeline</h1>
          <p className="text-xs text-white/60">Phoenician CRM</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                location === href ? 'bg-white/15 font-medium' : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          {user.picture && <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-white/50 truncate">{user.email}</p>
          </div>
          <button onClick={onLogout} className="p-1.5 hover:bg-white/10 rounded" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
