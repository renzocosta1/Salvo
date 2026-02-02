import * as Contacts from 'expo-contacts';
import { supabase } from '../supabase';

export interface ContactInfo {
  id: string;
  name: string;
  phoneNumber?: string;
}

/**
 * Request contacts permission
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return false;
  }
}

/**
 * Get all contacts from device
 */
export async function getDeviceContacts(): Promise<{
  success: boolean;
  contacts?: ContactInfo[];
  error?: string;
}> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      return { success: false, error: 'Contacts permission not granted' };
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    if (!data) {
      return { success: false, error: 'No contacts found' };
    }

    // Extract contacts with phone numbers
    const contactList: ContactInfo[] = [];

    for (const contact of data) {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        // Get the first phone number for simplicity
        const phoneNumber = contact.phoneNumbers[0].number;
        if (phoneNumber) {
          contactList.push({
            id: contact.id,
            name: contact.name || 'Unknown',
            phoneNumber: phoneNumber,
          });
        }
      }
    }

    return { success: true, contacts: contactList };
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return { success: false, error: 'Failed to fetch contacts' };
  }
}

/**
 * Update contacts synced timestamp
 */
export async function markContactsSynced(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ contacts_synced_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating contacts sync time:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating contacts sync time:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Format phone number to E.164 format (basic implementation)
 * In production, use a library like libphonenumber-js
 */
export function formatPhoneE164(phone: string, defaultCountryCode = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with country code, return as is
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return defaultCountryCode + digits;
  }

  // Otherwise, assume it already has country code
  return '+' + digits;
}

/**
 * Check which contacts are already Salvo users
 * This is a placeholder - in production, you'd send phone numbers to backend
 * for privacy-safe lookup
 */
export async function findExistingUsers(
  phoneNumbers: string[]
): Promise<{
  success: boolean;
  existingUsers?: Array<{ phoneNumber: string; userId: string }>;
  error?: string;
}> {
  try {
    // In a production app, you would:
    // 1. Hash the phone numbers on the client
    // 2. Send hashes to server
    // 3. Server checks hashes against database
    // 4. Return matches without exposing user data

    // For MVP, we'll just return empty array
    // This feature requires backend API implementation
    return { success: true, existingUsers: [] };
  } catch (error) {
    console.error('Error finding existing users:', error);
    return { success: false, error: 'Failed to check existing users' };
  }
}
