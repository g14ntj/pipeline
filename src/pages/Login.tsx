import { useEffect, useState } from 'react';
import { GridBackground } from '@/components/GridBackground';
import logoBanner from '@/assets/PhoenicianBannerLogo.png';

export function LoginPage() {
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) setError(decodeURIComponent(err));

    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen bg-navy-deep text-paper">
      <GridBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center">
          <img src={logoBanner} alt="Phoenician" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-paper">Pipeline</h1>
          <p className="mt-1 text-sm text-muted">Internal sales &amp; ops CRM</p>

          {error && (
            <p className="mt-6 rounded-lg border border-fragmented-red/30 bg-fragmented-red/10 p-3 text-sm text-paper">
              {error}
            </p>
          )}

          {!configured && (
            <p className="mt-6 rounded-lg border border-cerulean/30 bg-cerulean/10 p-3 text-sm text-paper">
              Google OAuth not configured. Set PIPELINE_GOOGLE_CLIENT_ID and PIPELINE_GOOGLE_CLIENT_SECRET.
            </p>
          )}

          <a href="/api/auth/login" className="btn-primary mt-8 w-full py-3">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </a>

          <p className="mt-6 text-xs text-muted">
            Authorized users only — sign in with your @phoeniciantech.com Google account
          </p>
        </div>
      </div>
    </div>
  );
}
