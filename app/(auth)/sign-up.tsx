import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) setError(signUpError.message);
    else if (!data.session) setMessage('Check your email to confirm your account.');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.info}>{message}</Text>}
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.primaryButton} onPress={onSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryLabel}>Sign up</Text>}
      </Pressable>
      <Text style={styles.footerText}>
        Already have an account? <Link href="/(auth)/sign-in" style={styles.link}>Sign in</Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 16,
    color: '#374151',
  },
  link: {
    color: '#DC2626',
    fontWeight: '700',
  },
  error: {
    color: '#DC2626',
    marginBottom: 8,
  },
  info: {
    color: '#065f46',
    marginBottom: 8,
  },
});


