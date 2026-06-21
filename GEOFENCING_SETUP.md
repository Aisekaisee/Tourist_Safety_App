# Geofencing Setup Guide

This guide will help you set up the Ola Maps geofencing integration in your Tourist Safety App.

## Prerequisites

1. **Ola Maps API Key**: You'll need to obtain an API key from Ola Maps for geofencing services.
2. **Supabase Database**: Ensure your Supabase database has the required tables.

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Ola Maps API Configuration
EXPO_PUBLIC_OLA_MAPS_API_KEY=your_ola_maps_api_key_here

# Default Country Code for Phone Numbers
EXPO_PUBLIC_DEFAULT_COUNTRY_CODE=+1
```

## Database Schema

Make sure your Supabase database has the following tables:

### alerts table
```sql
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_status table
```sql
CREATE TABLE user_status (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT NOT NULL DEFAULT 'safe',
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location TEXT
);
```

## Features

### 1. Automatic Geofencing
- Fetches user's GPS coordinates every 60 seconds
- Calls Ola Maps Geofencing API to check if user is in a high-risk zone
- Automatically triggers SOS alert when entering high-risk zones

### 2. SOS Alert System
- Saves alerts to Supabase database
- Continues location tracking every 60 seconds until SOS is cancelled
- Updates user status to 'sos_active' during alerts

### 3. High-Risk Zone Management
- Predefined high-risk zones (configurable in settings)
- Visual zone management in settings screen
- Support for different risk levels (low, medium, high, critical)

### 4. Fallback System
- If Ola Maps API is unavailable, uses local distance calculation
- Ensures geofencing continues to work even without API access

## Usage

1. **Start Geofencing**: The app automatically starts geofencing when the home screen loads
2. **Monitor Status**: Check the geofencing status card on the home screen
3. **Manage Zones**: Add/remove high-risk zones in the settings screen
4. **SOS Alerts**: When entering a high-risk zone, SOS is automatically triggered

## API Integration

The app integrates with Ola Maps API using the following endpoint:
- **POST** `/geofencing/status` - Check if coordinates are within high-risk zones

### Request Format
```json
{
  "coordinates": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "zones": [
    {
      "id": "zone_1",
      "name": "High Crime Area",
      "center": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "radius": 500,
      "riskLevel": "high"
    }
  ]
}
```

### Response Format
```json
{
  "status": "success",
  "data": {
    "isInHighRiskZone": true,
    "zoneId": "zone_1",
    "zoneName": "High Crime Area",
    "riskLevel": "high",
    "coordinates": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }
}
```

## Troubleshooting

1. **Location Permissions**: Ensure the app has foreground and background location permissions
2. **API Key**: Verify your Ola Maps API key is correctly set in environment variables
3. **Database**: Check that Supabase tables are created and accessible
4. **Network**: Ensure the device has internet connectivity for API calls

## Testing

To test the geofencing functionality:

1. Set up a test high-risk zone near your current location
2. Enable geofencing monitoring
3. Move to the test zone to trigger an SOS alert
4. Verify the alert is saved to the database
5. Test SOS cancellation functionality

## Customization

You can customize the geofencing behavior by modifying:

- **Check Interval**: Change the 60-second interval in `geofencingService.ts`
- **High-Risk Zones**: Add/remove zones in the settings screen
- **Risk Levels**: Modify risk level colors and behavior
- **API Endpoints**: Update Ola Maps API endpoints if needed
