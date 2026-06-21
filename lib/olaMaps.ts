interface OlaMapsGeofencingResponse {
  status: "success" | "error";
  data?: {
    isInHighRiskZone: boolean;
    zoneId?: string;
    zoneName?: string;
    riskLevel?: "low" | "medium" | "high" | "critical";
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  message?: string;
}

interface HighRiskZone {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters
  riskLevel: "low" | "medium" | "high" | "critical";
}

class OlaMapsService {
  private apiKey: string;
  private baseUrl: string;
  private highRiskZones: HighRiskZone[];

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || "";
    this.baseUrl = "https://api.olamaps.io/v1";

    // Predefined high-risk zones - in a real app, these would come from a database
    this.highRiskZones = [
      {
        id: "zone_1",
        name: "Downtown High Crime Area",
        coordinates: { latitude: 28.6139, longitude: 77.209 }, // Delhi example
        radius: 500, // 500 meters
        riskLevel: "high",
      },
      {
        id: "zone_2",
        name: "Industrial Zone - Night Risk",
        coordinates: { latitude: 28.5355, longitude: 77.391 },
        radius: 300,
        riskLevel: "critical",
      },
      {
        id: "zone_3",
        name: "Border Area - Restricted",
        coordinates: { latitude: 28.7041, longitude: 77.1025 },
        radius: 1000,
        riskLevel: "high",
      },
    ];
    // Quick debug note about API key presence (never log the raw key)
    if (!this.apiKey) {
      console.debug(
        "OlaMapsService: EXPO_PUBLIC_OLA_MAPS_API_KEY is not set - using fallback geofencing"
      );
    } else {
      console.debug(
        "OlaMapsService: EXPO_PUBLIC_OLA_MAPS_API_KEY is set (masked)"
      );
    }
  }

  /**
   * Check if user is in any high-risk zone using Ola Maps Geofencing API
   */
  async checkGeofencingStatus(
    latitude: number,
    longitude: number
  ): Promise<OlaMapsGeofencingResponse> {
    try {
      if (!this.apiKey) {
        console.warn(
          "Ola Maps API key not configured, using fallback geofencing"
        );
        return this.fallbackGeofencingCheck(latitude, longitude);
      }

      const url = `${this.baseUrl}/geofencing/status`;
      const payload = JSON.stringify({
        coordinates: { latitude, longitude },
        zones: this.highRiskZones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          center: zone.coordinates,
          radius: zone.radius,
          riskLevel: zone.riskLevel,
        })),
      });

      const response = await this.fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "X-API-Key": this.apiKey,
          },
          body: payload,
        },
        10000
      );

      if (!response.ok) {
        // try to capture response body for better error context
        let text = "";
        try {
          text = await response.text();
        } catch (e) {
          // ignore
        }
        throw new Error(
          `Ola Maps API error: ${response.status} ${response.statusText} - ${text}`
        );
      }

      // parse JSON safely
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        return data;
      }
      // unexpected content-type - return fallback with a message
      console.warn(
        "OlaMapsService: unexpected content-type from API:",
        contentType
      );
      return {
        status: "error",
        message: "Unexpected response from Ola Maps API",
      };
    } catch (error) {
      // Improve diagnostics for network errors
      // Typical fetch/network errors in React Native surface as TypeError with message 'Network request failed'
      const e: any = error;
      console.warn("OlaMapsService - checkGeofencingStatus failed (falling back to local calculations)", {
        name: e?.name,
        message: e?.message,
        code: e?.code,
      });

      // If the error contains a response-like object, try to log body
      if (e?.response) {
        try {
          const respText = await e.response.text();
          console.warn("OlaMapsService - response body:", respText);
        } catch (_err) {
          // ignore
        }
      }

      // Fallback to local geofencing check
      return this.fallbackGeofencingCheck(latitude, longitude);
    }
  }

  /**
   * Simple fetch wrapper with timeout using AbortController
   */
  private async fetchWithTimeout(
    input: RequestInfo,
    init: RequestInit = {},
    timeoutMs = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      } as RequestInit);
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      // rethrow so callers can inspect error.name/message
      throw err;
    }
  }

  /**
   * Fallback geofencing check using simple distance calculation
   * This is used when Ola Maps API is not available or fails
   */
  private fallbackGeofencingCheck(
    latitude: number,
    longitude: number
  ): OlaMapsGeofencingResponse {
    for (const zone of this.highRiskZones) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.coordinates.latitude,
        zone.coordinates.longitude
      );

      if (distance <= zone.radius) {
        return {
          status: "success",
          data: {
            isInHighRiskZone: true,
            zoneId: zone.id,
            zoneName: zone.name,
            riskLevel: zone.riskLevel,
            coordinates: { latitude, longitude },
          },
        };
      }
    }

    return {
      status: "success",
      data: {
        isInHighRiskZone: false,
        coordinates: { latitude, longitude },
      },
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get all configured high-risk zones
   */
  getHighRiskZones(): HighRiskZone[] {
    return this.highRiskZones;
  }

  /**
   * Add a new high-risk zone
   */
  addHighRiskZone(zone: HighRiskZone): void {
    this.highRiskZones.push(zone);
  }

  /**
   * Remove a high-risk zone by ID
   */
  removeHighRiskZone(zoneId: string): void {
    this.highRiskZones = this.highRiskZones.filter(
      (zone) => zone.id !== zoneId
    );
  }
}

export const olaMapsService = new OlaMapsService();
export type { HighRiskZone, OlaMapsGeofencingResponse };
