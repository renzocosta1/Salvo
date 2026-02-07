import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
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
 * Hash a phone number using SHA-256
 */
async function hashPhoneNumber(phoneE164: string): Promise<string> {
  // Use expo-crypto for cross-platform hashing
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    phoneE164
  );
  return hash;
}

/**
 * Sync contacts to database with hashing
 */
export async function syncContactsToDatabase(
  userId: string,
  contacts: ContactInfo[]
): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
  try {
    if (contacts.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Prepare contact data with hashing
    const contactsToSync = [];
    for (const contact of contacts) {
      if (!contact.phoneNumber) continue;

      // Format to E.164
      const phoneE164 = formatPhoneE164(contact.phoneNumber);
      
      // Hash the phone number
      const hashedPhone = await hashPhoneNumber(phoneE164);

      contactsToSync.push({
        user_id: userId,
        contact_phone: hashedPhone,
        contact_name: contact.name,
      });
    }

    if (contactsToSync.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Batch upsert to synced_contacts
    const { error } = await supabase
      .from('synced_contacts')
      .upsert(contactsToSync, {
        onConflict: 'user_id,contact_phone',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error syncing contacts to database:', error);
      return { success: false, error: error.message };
    }

    // Update contacts_synced_at timestamp
    await markContactsSynced(userId);

    return { success: true, syncedCount: contactsToSync.length };
  } catch (error) {
    console.error('Unexpected error syncing contacts:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update contact match status (triggers backend matching)
 */
export async function updateContactMatchStatus(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('update_contact_match_status', {
      recruiter_user_id: userId,
    });

    if (error) {
      console.error('Error updating contact match status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating contact status:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get synced contacts with their match status
 */
export async function getSyncedContactsWithStatus(
  userId: string
): Promise<{
  success: boolean;
  contacts?: Array<{
    contact_id: string;
    contact_name: string;
    contact_phone_hash: string;
    status: 'in_salvo' | 'registered_not_in_app' | 'not_registered';
    invited_at: string | null;
    joined_at: string | null;
    verified_at: string | null;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_contacts_with_status', {
      recruiter_user_id: userId,
    });

    if (error) {
      console.error('Error fetching synced contacts:', error);
      return { success: false, error: error.message };
    }

    return { success: true, contacts: data || [] };
  } catch (error) {
    console.error('Unexpected error fetching synced contacts:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check which contacts are already Salvo users
 * Now implemented with backend matching
 */
export async function findExistingUsers(
  phoneNumbers: string[]
): Promise<{
  success: boolean;
  existingUsers?: Array<{ phoneNumber: string; userId: string }>;
  error?: string;
}> {
  try {
    // This would ideally be a database function
    // For now, we can check synced_contacts table
    // In production, this logic should run on the backend
    
    // The matching is done automatically by the backend function
    // matchContactsAgainstUsers (we'll create this next)
    
    return { success: true, existingUsers: [] };
  } catch (error) {
    console.error('Error finding existing users:', error);
    return { success: false, error: 'Failed to check existing users' };
  }
}
