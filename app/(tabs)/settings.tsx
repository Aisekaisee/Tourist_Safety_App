import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Bell, Camera, ChevronRight, CircleHelp as HelpCircle, MapPin, Mic, Settings as SettingsIcon, Shield, Smartphone, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };
  const [locationSharing, setLocationSharing] = useState(true);
  const [audioRecording, setAudioRecording] = useState(true);
  const [videoRecording, setVideoRecording] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSOS, setAutoSOS] = useState(false);

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    hasSwitch = false, 
    switchValue = false, 
    onSwitchChange, 
    onPress,
    color = '#6B7280'
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    onPress?: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={hasSwitch ? 1 : 0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
          <Icon size={20} color={color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#D1D5DB', true: '#059669' }}
          thumbColor={switchValue ? '#FFFFFF' : '#FFFFFF'}
        />
      ) : (
        <ChevronRight size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your safety preferences</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={User}
              title="Personal Information"
              subtitle="Update your profile details"
              color="#3B82F6"
            />
          </View>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Settings</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={MapPin}
              title="Location Sharing"
              subtitle="Share location during emergencies"
              hasSwitch={true}
              switchValue={locationSharing}
              onSwitchChange={setLocationSharing}
              color="#059669"
            />
            
            <SettingItem
              icon={Mic}
              title="Audio Recording"
              subtitle="Record audio during SOS activation"
              hasSwitch={true}
              switchValue={audioRecording}
              onSwitchChange={setAudioRecording}
              color="#DC2626"
            />
            
            <SettingItem
              icon={Camera}
              title="Video Recording"
              subtitle="Record video during emergencies"
              hasSwitch={true}
              switchValue={videoRecording}
              onSwitchChange={setVideoRecording}
              color="#7C3AED"
            />
            
            <SettingItem
              icon={Smartphone}
              title="Auto SOS"
              subtitle="Activate SOS if phone detects crash"
              hasSwitch={true}
              switchValue={autoSOS}
              onSwitchChange={setAutoSOS}
              color="#EA580C"
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Bell}
              title="Push Notifications"
              subtitle="Receive safety alerts and updates"
              hasSwitch={true}
              switchValue={notifications}
              onSwitchChange={setNotifications}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Shield}
              title="Privacy Policy"
              subtitle="How we protect your data"
              color="#6B7280"
            />
            
            <SettingItem
              icon={Shield}
              title="Data Management"
              subtitle="Manage your stored data"
              color="#6B7280"
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={HelpCircle}
              title="Help Center"
              subtitle="Get help and support"
              color="#6B7280"
            />
            
            <SettingItem
              icon={HelpCircle}
              title="Contact Support"
              subtitle="Get in touch with our team"
              color="#6B7280"
            />
            <SettingItem
              icon={SettingsIcon}
              title="Sign out"
              subtitle="Log out of your account"
              color="#EF4444"
              onPress={onSignOut}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Safety SOS v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>
            Your safety is our priority. This app helps you stay safe and connected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfo: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});