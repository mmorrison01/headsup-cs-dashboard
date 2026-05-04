'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await authClient.signIn.email({ email, password });

    if (error) {
      setError('Invalid email or password.');
      setLoading(false);
    } else {
      router.push('/');
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
  }

  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-sm bg-protocol-blue flex items-center justify-center">
            <span className="font-sans text-sm font-bold text-white">H</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-pulse-blue font-semibold">
              Heads Up
            </div>
            <div className="text-[11px] text-white/60 -mt-0.5">CS Operating Dashboard</div>
          </div>
        </div>

        <h1 className="text-2xl font-sans font-semibold text-white mb-1">Sign in</h1>
        <p className="text-sm text-white/50 mb-8">Heads Up team access only</p>

        {/* Google SSO */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md bg-white text-dark-text text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-60 mb-6"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-white/30 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-[11px] text-white/50 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@headsup.health"
              className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-pulse-blue focus:bg-white/8 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/50 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-pulse-blue transition-colors"
            />
          </div>

          {error && (
            <p className="text-status-red text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-protocol-blue text-white text-sm font-medium hover:bg-protocol-blue/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
