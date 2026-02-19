'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { MFAForm } from '@/components/auth/MFAForm';

export default function LoginPage() {
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const router = useRouter();

  if (mfaToken) {
    return (
      <div>
        <h2>Two-Factor Authentication</h2>
        <p>Enter the code from your authenticator app.</p>
        <MFAForm mfaToken={mfaToken} />
        <button onClick={() => setMfaToken(null)}>Back to login</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Sign in</h2>
      <LoginForm onMFARequired={(token) => setMfaToken(token)} />
      <p>
        Don&apos;t have an account?{' '}
        <Link href="/register">Create one</Link>
      </p>
    </div>
  );
}
