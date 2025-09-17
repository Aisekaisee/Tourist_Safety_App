import AsyncStorage from '@react-native-async-storage/async-storage';

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
};

const STORAGE_KEY = 'emergency_contacts';

export async function loadContacts(): Promise<EmergencyContact[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: EmergencyContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // ignore
  }
}


