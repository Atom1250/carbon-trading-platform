'use client';

import { useSearchParams } from 'next/navigation';
import { MFAForm } from '@/components/auth/MFAForm';

export default function VerifyMFAPage() {
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get('token');

  if (!mfaToken) {
    return (
      <div>
        <h2>Invalid Request</h2>
        <p>No MFA token provided. Please go back and log in again.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <p>Enter the code from your authenticator app.</p>
      <MFAForm mfaToken={mfaToken} />
    </div>
  );
}
