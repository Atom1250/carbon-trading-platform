import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <div className="auth-container">
        <div className="auth-brand">
          <h1>Carbon Trading Platform</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
