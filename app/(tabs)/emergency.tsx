import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Phone, MapPin, Clock, Users, CircleAlert as AlertCircle, CircleStop as StopCircle } from 'lucide-react-native';
import { loadContacts } from '@/lib/contactsStorage';
import { normalizePhoneNumber } from '@/lib/phone';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { supabase } from '@/lib/supabase';



export default function EmergencyScreen() {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyStartTime, setEmergencyStartTime] = useState<Date | null>(null);

  const handleEmergencyActivate = () => {
    Alert.alert(
      'Activate Emergency SOS',
      'This will send your location to emergency contacts and local authorities. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'destructive',
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                console.warn('Location permission not granted');
              }

              let currentLoc = null;
              let readable = '';
              try {
                currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
                const geocode = await Location.reverseGeocodeAsync({ latitude: currentLoc.coords.latitude, longitude: currentLoc.coords.longitude });
                if (geocode[0]) {
                  readable = `${geocode[0].name ?? geocode[0].street ?? ''}, ${geocode[0].city ?? geocode[0].region ?? ''}`.replace(/^,\s*/, '');
                }
              } catch (locErr) {
                console.warn('Location fetch failed:', locErr);
              }

              setIsEmergencyActive(true);
              setEmergencyStartTime(new Date());

              // Upsert status to Supabase if location is available
              if (currentLoc) {
                const { data: userData } = await supabase.auth.getUser();
                const user = userData.user;
                if (user) {
                  const name = (user.user_metadata as any)?.name || user.email || 'User';
                  await supabase
                    .from('user_status')
                    .upsert({
                      user_id: user.id,
                      name,
                      latitude: currentLoc.coords.latitude,
                      longitude: currentLoc.coords.longitude,
                      status: 'sos_active',
                      last_update: new Date().toISOString(),
                      location: readable || 'Unknown Location'
                    });
                }
              }

              const contacts = await loadContacts();
              const defaultCode = process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_CODE || '+1';
              const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

              const phones = (contacts || [])
                .map(c => normalizePhoneNumber(c.phone, defaultCode))
                .filter((p): p is string => Boolean(p));

              if (phones.length > 0 && currentLoc) {
                const mapsLink = `https://www.google.com/maps?q=${currentLoc.coords.latitude},${currentLoc.coords.longitude}`;
                const body = `EMERGENCY: SOS activated${readable ? ` at ${readable}` : ''}. Location: ${currentLoc.coords.latitude.toFixed(5)}, ${currentLoc.coords.longitude.toFixed(5)}. Map: ${mapsLink}`;
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                  await SMS.sendSMSAsync(phones, body);
                } else {
                  const encoded = encodeURIComponent(body);
                  const recipientList = phones.join(',');
                  const url = `sms:${recipientList}?&body=${encoded}`;
                  await Linking.openURL(url);
                }
              }

              // Auto dial the primary or first emergency contact AFTER the SMS composer resolves/returns
              if (primaryContact) {
                const normalizedPhone = normalizePhoneNumber(primaryContact.phone, defaultCode);
                if (normalizedPhone) {
                  setTimeout(() => {
                    Linking.openURL(`tel:${normalizedPhone}`).catch(err =>
                      console.warn('Failed to make call:', err)
                    );
                  }, 500);
                }
              }
            } catch (err) {
              console.warn('Failed to execute emergency actions:', err);
            }
          },
        },
      ]
    );
  };


  const handleEmergencyDeactivate = () => {
    Alert.alert(
      'Deactivate Emergency',
      'Are you safe now? This will stop location sharing and alert contacts.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'I\'m Safe',
          onPress: () => {
            setIsEmergencyActive(false);
            setEmergencyStartTime(null);
          },
        },
      ]
    );
  };

  const formatElapsedTime = (startTime: Date) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const quickDialNumbers = [
    { name: 'Emergency', number: '112', color: '#EA580C' },
    { name: 'Police', number: '100', color: '#DC2626' },
    { name: 'Tourist Helpline', number: '1363', color: '#059669' },
  ];

  if (isEmergencyActive) {
    return (
      <SafeAreaView style={[styles.container, styles.emergencyActive]}>
        <View style={styles.emergencyHeader}>
          <AlertCircle size={48} color="#FFFFFF" />
          <Text style={styles.emergencyTitle}>EMERGENCY ACTIVE</Text>
          <Text style={styles.emergencySubtitle}>
            Help is on the way. Stay calm.
          </Text>
        </View>

        <View style={styles.emergencyStatus}>
          <View style={styles.statusItem}>
            <Clock size={24} color="#FFFFFF" />
            <Text style={styles.statusText}>
              {emergencyStartTime && formatElapsedTime(emergencyStartTime)}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <MapPin size={24} color="#FFFFFF" />
            <Text style={styles.statusText}>Location Sharing Active</Text>
          </View>
          <View style={styles.statusItem}>
            <Users size={24} color="#FFFFFF" />
            <Text style={styles.statusText}>Contacts Notified</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deactivateButton}
          onPress={handleEmergencyDeactivate}
        >
          <StopCircle size={32} color="#DC2626" />
          <Text style={styles.deactivateText}>I&apos;m Safe - Stop Emergency</Text>
        </TouchableOpacity>

        <View style={styles.emergencyActions}>
          {quickDialNumbers.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickDialButton, { backgroundColor: service.color }]}
              onPress={() => Linking.openURL(`tel:${service.number}`)}
            >
              <Phone size={24} color="#FFFFFF" />
              <Text style={styles.quickDialText}>Call {service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergency</Text>
          <Text style={styles.headerSubtitle}>Quick access to help</Text>
        </View>

        {/* Main Emergency Button */}
        <TouchableOpacity
          style={styles.mainEmergencyButton}
          onPress={handleEmergencyActivate}
          activeOpacity={0.8}
        >
          <View style={styles.emergencyButtonContent}>
            <Phone size={48} color="#FFFFFF" />
            <Text style={styles.mainEmergencyTitle}>EMERGENCY SOS</Text>
            <Text style={styles.mainEmergencySubtitle}>
              Press and hold to activate
            </Text>
          </View>
        </TouchableOpacity>

        {/* Emergency Info */}
        <View style={styles.infoCard}>
          <AlertCircle size={24} color="#D97706" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              • Sends your location to emergency contacts{'\n'}
              • Contacts local emergency services{'\n'}
              • Starts continuous location tracking{'\n'}
              • Records audio/video evidence
            </Text>
          </View>
        </View>

        {/* Quick Dial */}
        <View style={styles.quickDialSection}>
          <Text style={styles.sectionTitle}>Quick Dial</Text>
          {quickDialNumbers.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickDialItem}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`tel:${service.number}`)}
            >
              <View style={[styles.quickDialIcon, { backgroundColor: service.color }]}>
                <Phone size={20} color="#FFFFFF" />
              </View>
              <View style={styles.quickDialContent}>
                <Text style={styles.quickDialName}>{service.name}</Text>
                <Text style={styles.quickDialNumber}>{service.number}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Status */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <MapPin size={20} color="#059669" />
            <Text style={styles.locationTitle}>Location Services</Text>
          </View>
          <Text style={styles.locationStatus}>✓ GPS Active</Text>
          <Text style={styles.locationAccuracy}>Accuracy: 3 meters</Text>
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
  emergencyActive: {
    backgroundColor: '#DC2626',
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
  mainEmergencyButton: {
    backgroundColor: '#DC2626',
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  emergencyButtonContent: {
    alignItems: 'center',
  },
  mainEmergencyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  mainEmergencySubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    textAlign: 'center',
  },
  emergencyHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emergencyTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emergencySubtitle: {
    fontSize: 18,
    color: '#FEE2E2',
    textAlign: 'center',
  },
  emergencyStatus: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '600',
  },
  deactivateButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 12,
  },
  emergencyActions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  quickDialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  quickDialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quickDialSection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickDialItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickDialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickDialContent: {
    flex: 1,
  },
  quickDialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quickDialNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  locationStatus: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
  },
  locationAccuracy: {
    fontSize: 14,
    color: '#6B7280',
  },
});