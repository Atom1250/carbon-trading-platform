import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div>
      <h2>Create account</h2>
      <RegisterForm />
      <p>
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
