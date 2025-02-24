import HomeUnconnected from '@/components/home';
import Dashboard from '@/components/dashboard';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  if (session && session.user) {
    return <Dashboard session={session} />;
  }

  return <HomeUnconnected />;
}
