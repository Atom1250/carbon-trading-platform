'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.email}</p>
      <p>Role: {user?.role}</p>
      <button onClick={() => logout()}>Sign out</button>
    </div>
  );
}
