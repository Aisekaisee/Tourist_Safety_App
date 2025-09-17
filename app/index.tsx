import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth';

export default function Index() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/sign-in" />;
}


