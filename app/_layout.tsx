import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/providers/auth';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Slot />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
