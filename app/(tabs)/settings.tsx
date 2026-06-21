import { HighRiskZone, olaMapsService } from '@/lib/olaMaps';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Bell, Camera, ChevronRight, CircleHelp as HelpCircle, MapPin, Mic, Plus, Settings as SettingsIcon, Shield, Smartphone, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [highRiskZones, setHighRiskZones] = useState<HighRiskZone[]>([]);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };
  const [locationSharing, setLocationSharing] = useState(true);
  const [audioRecording, setAudioRecording] = useState(true);
  const [videoRecording, setVideoRecording] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  useEffect(() => {
    // Load high-risk zones
    const zones = olaMapsService.getHighRiskZones();
    setHighRiskZones(zones);

    // Load settings
    AsyncStorage.getItem('settings_shake_trigger').then(val => {
      setShakeTrigger(val === 'true');
    });
  }, []);

  const handleToggleShakeTrigger = async (value: boolean) => {
    setShakeTrigger(value);
    await AsyncStorage.setItem('settings_shake_trigger', value ? 'true' : 'false');
  };


  const deleteZone = (zoneId: string) => {
    olaMapsService.removeHighRiskZone(zoneId);
    setHighRiskZones(olaMapsService.getHighRiskZones());
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '#059669';
      case 'medium': return '#D97706';
      case 'high': return '#DC2626';
      case 'critical': return '#7C2D12';
      default: return '#6B7280';
    }
  };

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

        {/* High-Risk Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>High-Risk Zones</Text>
          <View style={styles.sectionCard}>
            {highRiskZones.map((zone) => (
              <View key={zone.id} style={styles.zoneItem}>
                <View style={styles.zoneLeft}>
                  <View style={[styles.zoneIcon, { backgroundColor: getRiskLevelColor(zone.riskLevel) + '15' }]}>
                    <MapPin size={20} color={getRiskLevelColor(zone.riskLevel)} />
                  </View>
                  <View style={styles.zoneContent}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneDetails}>
                      {zone.coordinates.latitude.toFixed(4)}, {zone.coordinates.longitude.toFixed(4)} • {zone.radius}m radius
                    </Text>
                    <Text style={[styles.zoneRiskLevel, { color: getRiskLevelColor(zone.riskLevel) }]}>
                      {zone.riskLevel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteZoneButton}
                  onPress={() => deleteZone(zone.id)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addZoneButton}>
              <Plus size={20} color="#3B82F6" />
              <Text style={styles.addZoneText}>Add New Zone</Text>
            </TouchableOpacity>
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
              title="Shake to Trigger"
              subtitle="Activate SOS by shaking your phone"
              hasSwitch={true}
              switchValue={shakeTrigger}
              onSwitchChange={handleToggleShakeTrigger}
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
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  zoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  zoneContent: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  zoneDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  zoneRiskLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteZoneButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addZoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
});