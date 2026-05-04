'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn('azure-ad', { callbackUrl: '/' });
  }

  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
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

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md bg-[#2F2F2F] text-white text-sm font-medium hover:bg-[#3a3a3a] transition-colors disabled:opacity-60 border border-white/10"
        >
          <MicrosoftIcon />
          {loading ? 'Redirecting…' : 'Sign in with Microsoft'}
        </button>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
