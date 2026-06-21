import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { OlaMapsGeofencingResponse, olaMapsService } from './olaMaps';
import { supabase } from './supabase';
import { loadContacts } from './contactsStorage';
import { normalizePhoneNumber } from './phone';


interface GeofencingConfig {
  checkInterval: number; // in milliseconds
  locationAccuracy: Location.Accuracy;
  distanceInterval: number; // in meters
}

interface SOSAlert {
  id: string;
  userId: string;
  zoneId: string;
  zoneName: string;
  riskLevel: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  triggeredAt: string;
  status: 'active' | 'cancelled' | 'resolved';
}

class GeofencingService {
  private locationWatcher: Location.LocationSubscription | null = null;
  private geofencingInterval: ReturnType<typeof setInterval> | null = null;
  private isActive = false;
  private activeAlertId: string | null = null;
  private config: GeofencingConfig;
  private onSOSTriggered?: (alert: SOSAlert) => void;
  private onLocationUpdate?: (coords: { latitude: number; longitude: number }) => void;


  constructor(config: GeofencingConfig = {
    checkInterval: 60000, // 60 seconds
    locationAccuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 10 // 10 meters
  }) {
    this.config = config;
  }

  /**
   * Start geofencing monitoring
   */
  async startGeofencing(): Promise<void> {
    if (this.isActive) {
      console.warn('Geofencing is already active');
      return;
    }

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Request background location permissions for continuous tracking
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('Background location permission not granted - geofencing may not work when app is backgrounded');
      }

      this.isActive = true;

      // Start location watching for continuous updates
      this.locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: this.config.locationAccuracy,
          timeInterval: this.config.checkInterval,
          distanceInterval: this.config.distanceInterval,
        },
        this.handleLocationUpdate.bind(this)
      );

      // Also set up a fallback interval in case location watching fails
      this.geofencingInterval = setInterval(async () => {
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: this.config.locationAccuracy
          });
          await this.handleLocationUpdate(current);
        } catch (error) {
          console.error('Fallback location check failed:', error);
        }
      }, this.config.checkInterval);

      console.log('Geofencing started successfully');
    } catch (error) {
      console.error('Failed to start geofencing:', error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Stop geofencing monitoring
   */
  stopGeofencing(): void {
    if (this.locationWatcher) {
      this.locationWatcher.remove();
      this.locationWatcher = null;
    }

    if (this.geofencingInterval) {
      clearInterval(this.geofencingInterval);
      this.geofencingInterval = null;
    }

    this.isActive = false;
    console.log('Geofencing stopped');
  }

  /**
   * Handle location updates and check geofencing status
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    if (!this.isActive) return;
    if (this.activeAlertId) return; // Already has an active automatic SOS alert


    const { latitude, longitude } = location.coords;

    // Notify about location update
    if (this.onLocationUpdate) {
      this.onLocationUpdate({ latitude, longitude });
    }

    try {
      // Check geofencing status with Ola Maps API
      const geofencingResponse: OlaMapsGeofencingResponse = await olaMapsService.checkGeofencingStatus(
        latitude,
        longitude
      );

      if (geofencingResponse.status === 'success' && geofencingResponse.data?.isInHighRiskZone) {
        console.log('User entered high-risk zone:', geofencingResponse.data.zoneName);
        await this.triggerSOS(
          geofencingResponse.data.zoneId!,
          geofencingResponse.data.zoneName!,
          geofencingResponse.data.riskLevel!,
          { latitude, longitude }
        );
      }
    } catch (error) {
      console.error('Geofencing check failed:', error);
    }
  }

  /**
   * Trigger SOS alert when entering high-risk zone
   */
  private async triggerSOS(
    zoneId: string,
    zoneName: string,
    riskLevel: string,
    coordinates: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Create SOS alert
      const alert: SOSAlert = {
        id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        zoneId,
        zoneName,
        riskLevel,
        coordinates,
        triggeredAt: new Date().toISOString(),
        status: 'active'
      };

      // Save alert to Supabase
      const { error: insertError } = await supabase
        .from('alerts')
        .insert({
          id: alert.id,
          user_id: alert.userId,
          zone_id: alert.zoneId,
          zone_name: alert.zoneName,
          risk_level: alert.riskLevel,
          latitude: alert.coordinates.latitude,
          longitude: alert.coordinates.longitude,
          triggered_at: alert.triggeredAt,
          status: alert.status
        });

      if (insertError) {
        console.error('Failed to save SOS alert to database:', insertError);
        return;
      }

      this.activeAlertId = alert.id;

      // Update user status to SOS active
      await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          status: 'sos_active',
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          last_update: new Date().toISOString()
        });

      console.log('SOS alert triggered and saved:', alert.id);

      // Notify callback
      if (this.onSOSTriggered) {
        this.onSOSTriggered(alert);
      }

      // Reverse geocode to get a readable address and send SMS (non-blocking)
      Location.reverseGeocodeAsync(coordinates)
        .then(async (geocode) => {
          const readableAddress = geocode[0]
            ? `${geocode[0].name ?? geocode[0].street ?? ''}, ${geocode[0].city ?? geocode[0].region ?? ''}`.replace(/^,\s*/, '')
            : '';

          // Fetch contacts and send SMS
          const contacts = await loadContacts();
          const defaultCode = process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_CODE || '+1';
          const phones = (contacts || [])
            .map(c => normalizePhoneNumber(c.phone, defaultCode))
            .filter((p): p is string => Boolean(p));

          if (phones.length > 0) {
            const mapsLink = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
            const body = `AUTOMATIC EMERGENCY SOS: Entered high-risk zone "${zoneName}" (Risk: ${riskLevel.toUpperCase()})${readableAddress ? ` near ${readableAddress}` : ''}. Map: ${mapsLink}`;

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
        })
        .catch((err) => {
          console.error('Failed to send auto-trigger SOS SMS:', err);
        });

    } catch (error) {
      console.error('Failed to trigger SOS:', error);
    }
  }

  /**
   * Cancel active SOS alert
   */
  async cancelSOS(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'cancelled' })
        .eq('id', alertId);

      if (error) {
        console.error('Failed to cancel SOS alert:', error);
        return;
      }

      if (this.activeAlertId === alertId) {
        this.activeAlertId = null;
      }

      // Update user status back to safe
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('user_status')
          .upsert({
            user_id: userData.user.id,
            status: 'safe',
            last_update: new Date().toISOString()
          });
      }

      console.log('SOS alert cancelled:', alertId);
    } catch (error) {
      console.error('Failed to cancel SOS alert:', error);
    }
  }

  /**
   * Set callback for SOS triggered events
   */
  setOnSOSTriggered(callback: (alert: SOSAlert) => void): void {
    this.onSOSTriggered = callback;
  }

  /**
   * Set callback for location update events
   */
  setOnLocationUpdate(callback: (coords: { latitude: number; longitude: number }) => void): void {
    this.onLocationUpdate = callback;
  }

  /**
   * Check if geofencing is currently active
   */
  isGeofencingActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current configuration
   */
  getConfig(): GeofencingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GeofencingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const geofencingService = new GeofencingService();
export type { GeofencingConfig, SOSAlert };
