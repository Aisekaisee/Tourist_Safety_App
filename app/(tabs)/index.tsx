import { loadContacts } from '@/lib/contactsStorage';
import { normalizePhoneNumber } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { TriangleAlert as AlertTriangle, ChevronRight, Clock, MapPin, Phone, Shield } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [safetyScore, setSafetyScore] = useState(78);
  const [location, setLocation] = useState('Downtown Area, City Center');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isSosActive, setIsSosActive] = useState(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  const getSafetyColor = (score: number) => {
    if (score >= 70) return '#059669'; // Green
    if (score >= 40) return '#D97706'; // Amber
    return '#DC2626'; // Red
  };

  const getSafetyLabel = (score: number) => {
    if (score >= 70) return 'Safe';
    if (score >= 40) return 'Moderate';
    return 'High Risk';
  };

  const upsertUserStatus = async (params: { latitude: number; longitude: number; status: 'safe' | 'emergency' | 'sos_active'; locationName?: string }) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const name = (user.user_metadata as any)?.name || user.email || 'User';
    const readableLocation = params.locationName ?? location;

    const { data: existingRow, error: selectError } = await supabase
      .from('user_status')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (selectError) {
      console.warn('user_status select failed', selectError.message);
      return;
    }

    if (existingRow?.id) {
      const { error: updateError } = await supabase
        .from('user_status')
        .update({
          name,
          latitude: params.latitude,
          longitude: params.longitude,
          status: params.status,
          last_update: new Date().toISOString(),
          location: readableLocation,
        })
        .eq('id', existingRow.id);
      if (updateError) console.warn('user_status update failed', updateError.message);
    } else {
      const { error: insertError } = await supabase
        .from('user_status')
        .insert({
          user_id: user.id,
          name,
          latitude: params.latitude,
          longitude: params.longitude,
          status: params.status,
          last_update: new Date().toISOString(),
          location: readableLocation,
        });
      if (insertError) console.warn('user_status insert failed', insertError.message);
    }
  };

  const startSos = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    const geocode = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    const readable = geocode[0]
      ? `${geocode[0].name ?? geocode[0].street ?? ''}, ${geocode[0].city ?? geocode[0].region ?? ''}`.replace(/^,\s*/, '')
      : undefined;

    setIsSosActive(true);
    setLastUpdate(new Date());
    if (readable) setLocation(readable);
    await upsertUserStatus({ latitude: current.coords.latitude, longitude: current.coords.longitude, status: 'sos_active', locationName: readable });

    // Notify saved contacts via SMS with current location
    try {
      const contacts = await loadContacts();
      const defaultCode = process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_CODE || '+1';
      const phones = (contacts || [])
        .map(c => normalizePhoneNumber(c.phone, defaultCode))
        .filter((p): p is string => Boolean(p));
      if (phones.length > 0) {
        const mapsLink = `https://www.google.com/maps?q=${current.coords.latitude},${current.coords.longitude}`;
        const body = `EMERGENCY: SOS activated${readable ? ` at ${readable}` : ''}. Location: ${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}. Map: ${mapsLink}`;
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
    } catch {
      // ignore share errors
    }

    locationWatcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      async pos => {
        setLastUpdate(new Date());
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const name = geo[0]
          ? `${geo[0].name ?? geo[0].street ?? ''}, ${geo[0].city ?? geo[0].region ?? ''}`.replace(/^,\s*/, '')
          : undefined;
        if (name) setLocation(name);
        await upsertUserStatus({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, status: 'sos_active', locationName: name });
      }
    );
  };

  const stopSos = async () => {
    if (locationWatcher.current) {
      locationWatcher.current.remove();
      locationWatcher.current = null;
    }
    setIsSosActive(false);
    const current = await Location.getCurrentPositionAsync({});
    await upsertUserStatus({ latitude: current.coords.latitude, longitude: current.coords.longitude, status: 'safe' });
  };

  const handleEmergencyPress = () => {
    if (isSosActive) {
      stopSos();
    } else {
      startSos();
    }
  };

  const shareCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const latitude = current.coords.latitude;
    const longitude = current.coords.longitude;
    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = geo[0]
      ? `${geo[0].name ?? geo[0].street ?? ''}, ${geo[0].city ?? geo[0].region ?? ''}`.replace(/^,\s*/, '')
      : undefined;
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = `My current location${place ? `: ${place}` : ''} (lat: ${latitude.toFixed(5)}, lng: ${longitude.toFixed(5)}). Map: ${mapsLink}`;
    try {
      await Share.share({ message });
    } catch {}
  };

  useEffect(() => {
    // Simulate real-time safety score updates
    const interval = setInterval(() => {
      setSafetyScore(prev => {
        const change = (Math.random() - 0.5) * 10;
        const newScore = Math.max(0, Math.min(100, prev + change));
        return Math.round(newScore);
      });
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safety Monitor</Text>
          <Text style={styles.headerSubtitle}>Real-time risk assessment</Text>
        </View>

        {/* Safety Score Card */}
        <View style={styles.safetyCard}>
          <View style={styles.scoreHeader}>
            <Shield size={24} color={getSafetyColor(safetyScore)} />
            <Text style={styles.scoreTitle}>Safety Score</Text>
          </View>
          
          <View style={styles.scoreDisplay}>
            <Text
              style={[
                styles.scoreNumber,
                { color: getSafetyColor(safetyScore) }
              ]}
            >
              {safetyScore}
            </Text>
            <Text style={styles.scoreOutOf}>/100</Text>
          </View>

          <View
            style={[
              styles.scoreLabel,
              { backgroundColor: getSafetyColor(safetyScore) + '15' }
            ]}
          >
            <Text
              style={[
                styles.scoreLabelText,
                { color: getSafetyColor(safetyScore) }
              ]}
            >
              {getSafetyLabel(safetyScore)}
            </Text>
          </View>

          <View style={styles.scoreDetails}>
            <View style={styles.detailItem}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.detailText}>{location}</Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.detailText}>
                Updated {lastUpdate.toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Button */}
        <TouchableOpacity
          style={[styles.emergencyButton, isSosActive && { backgroundColor: '#B91C1C' }]}
          onPress={handleEmergencyPress}
          activeOpacity={0.8}
        >
          <View style={styles.emergencyContent}>
            <View style={styles.emergencyIcon}>
              <Phone size={32} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.emergencyTitle}>{isSosActive ? 'SOS Active' : 'Emergency SOS'}</Text>
              <Text style={styles.emergencySubtitle}>{isSosActive ? 'Tap to stop and mark safe' : 'Tap for immediate help'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <AlertTriangle size={20} color="#D97706" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Report Incident</Text>
              <Text style={styles.actionSubtitle}>Report safety concerns</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={shareCurrentLocation}>
            <View style={styles.actionIcon}>
              <MapPin size={20} color="#3B82F6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Share Location</Text>
              <Text style={styles.actionSubtitle}>Send location to contacts</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Safety Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              Stay in well-lit areas and avoid isolated locations, especially after dark.
            </Text>
          </View>
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
  safetyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 64,
  },
  scoreOutOf: {
    fontSize: 24,
    color: '#6B7280',
    marginLeft: 4,
  },
  scoreLabel: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  scoreLabelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#B91C1C',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
  },
  actionsContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionItem: {
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
  actionIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tipsContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  tipText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});