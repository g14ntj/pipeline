import { useEffect, useState } from 'react';
import { Route, Switch, Redirect, useLocation } from 'wouter';
import { api, type User } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { LeadsPage } from '@/pages/Leads';
import { ContactsPage } from '@/pages/Contacts';
import { ContactDetailPage } from '@/pages/ContactDetail';
import { OrganizationsPage } from '@/pages/Organizations';
import { ProjectsPage } from '@/pages/Projects';
import { TriagePage } from '@/pages/Triage';

function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [location] = useLocation();
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [location] = useLocation();

  useEffect(() => {
    api.me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [location]);

  async function logout() {
    await api.logout();
    setUser(null);
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-deep text-muted">
        Loading…
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <LoginPage />}
      </Route>

      <Route>
        <ProtectedRoute user={user}>
          {user && (
            <Layout user={user} onLogout={logout}>
              <Switch>
                <Route path="/" component={DashboardPage} />
                <Route path="/leads" component={LeadsPage} />
                <Route path="/contacts/:id" component={ContactDetailPage} />
                <Route path="/contacts" component={ContactsPage} />
                <Route path="/organizations" component={OrganizationsPage} />
                <Route path="/projects" component={ProjectsPage} />
                <Route path="/triage" component={TriagePage} />
                <Route>
                  <Redirect to="/" />
                </Route>
              </Switch>
            </Layout>
          )}
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}
