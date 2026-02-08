import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import {
  getDeviceContacts,
  syncContactsToDatabase,
  getSyncedContactsWithStatus,
  updateContactMatchStatus,
  type ContactInfo,
} from '@/lib/recruiting/contacts';
import { createInvite } from '@/lib/recruiting/invites';
import { sendInviteSMS } from '@/lib/recruiting/sms';
import { formatPhoneE164 } from '@/lib/recruiting/contacts';

type ContactStatus = 'in_salvo' | 'registered_not_in_app' | 'not_registered';

interface SyncedContact {
  contact_id: string;
  contact_name: string;
  contact_phone_hash: string;
  status: ContactStatus;
  invited_at: string | null;
  joined_at: string | null;
  verified_at: string | null;
  // For display, we'll store the original phone if available
  phoneNumber?: string;
}

export default function ContactsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<ContactInfo[]>([]);

  useEffect(() => {
    loadContacts();
  }, [profile]);

  const loadContacts = async () => {
    if (!profile) return;

    setLoading(true);

    // Load synced contacts from database
    const result = await getSyncedContactsWithStatus(profile.id);
    if (result.success && result.contacts) {
      setContacts(result.contacts);
    }

    setLoading(false);
  };

  const handleSyncContacts = async () => {
    if (!profile) return;

    setSyncing(true);

    try {
      // Get device contacts
      const contactsResult = await getDeviceContacts();
      if (!contactsResult.success || !contactsResult.contacts) {
        Alert.alert('Error', contactsResult.error || 'Failed to get contacts');
        setSyncing(false);
        return;
      }

      setDeviceContacts(contactsResult.contacts);

      // Sync to database
      const syncResult = await syncContactsToDatabase(profile.id, contactsResult.contacts);
      if (!syncResult.success) {
        Alert.alert('Error', syncResult.error || 'Failed to sync contacts');
        setSyncing(false);
        return;
      }

      // Update match status
      await updateContactMatchStatus(profile.id);

      // Reload contacts
      await loadContacts();

      Alert.alert(
        'Contacts Synced',
        `Successfully synced ${syncResult.syncedCount} contacts`
      );
    } catch (error) {
      console.error('Error syncing contacts:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }

    setSyncing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleInviteContact = async (contact: SyncedContact) => {
    if (!profile) return;

    try {
      // Find the original phone number from device contacts
      const deviceContact = deviceContacts.find(
        (dc) => dc.name === contact.contact_name
      );

      if (!deviceContact || !deviceContact.phoneNumber) {
        Alert.alert('Error', 'Phone number not available for this contact');
        return;
      }

      const phoneE164 = formatPhoneE164(deviceContact.phoneNumber);

      // Create invite
      const inviteResult = await createInvite(profile.id, phoneE164);
      if (!inviteResult.success || !inviteResult.data) {
        Alert.alert('Error', inviteResult.error || 'Failed to create invite');
        return;
      }

      // Send SMS
      const smsResult = await sendInviteSMS(
        phoneE164,
        inviteResult.data.invite_code,
        profile.display_name || 'A friend'
      );

      if (!smsResult.success) {
        Alert.alert('Error', smsResult.error || 'Failed to send SMS');
        return;
      }

      // Update match status and reload
      await updateContactMatchStatus(profile.id);
      await loadContacts();
    } catch (error) {
      console.error('Error inviting contact:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const getStatusIcon = (status: ContactStatus) => {
    switch (status) {
      case 'in_salvo':
        return { name: 'checkmark-circle' as const, color: '#4caf50' }; // Green
      case 'registered_not_in_app':
        return { name: 'time' as const, color: '#ff9800' }; // Yellow
      case 'not_registered':
      default:
        return { name: 'help-circle-outline' as const, color: '#6c757d' }; // Gray
    }
  };

  const getStatusText = (status: ContactStatus) => {
    switch (status) {
      case 'in_salvo':
        return 'Verified';
      case 'registered_not_in_app':
        return 'Registered';
      case 'not_registered':
      default:
        return 'Not in app';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recruit</Text>
        <Text style={styles.headerSubtitle}>
          Find and recruit Maryland voters from your contacts
        </Text>
      </View>

      {/* Sync Button */}
      <Pressable
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSyncContacts}
        disabled={syncing}
      >
        <Ionicons
          name="sync"
          size={20}
          color={syncing ? '#6c757d' : '#ffffff'}
        />
        <Text style={styles.syncButtonText}>
          {syncing ? 'Syncing...' : 'Sync Contacts'}
        </Text>
      </Pressable>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
          <Text style={styles.legendText}>Verified in Salvo</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="time" size={16} color="#ff9800" />
          <Text style={styles.legendText}>Registered</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="help-circle-outline" size={16} color="#6c757d" />
          <Text style={styles.legendText}>Not in app</Text>
        </View>
      </View>

      {/* Contacts List */}
      <ScrollView
        style={styles.contactsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#2a3744" />
            <Text style={styles.emptyStateText}>No contacts synced yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap "Sync Contacts" to find Maryland voters in your phonebook
            </Text>
          </View>
        ) : (
          contacts.map((contact) => {
            const statusIcon = getStatusIcon(contact.status);
            const statusText = getStatusText(contact.status);
            const canInvite = contact.status === 'not_registered' && !contact.invited_at;

            return (
              <View key={contact.contact_id} style={styles.contactCard}>
                <View style={styles.contactCardLeft}>
                  <Ionicons
                    name={statusIcon.name}
                    size={24}
                    color={statusIcon.color}
                  />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.contact_name}</Text>
                    <Text style={styles.contactStatus}>{statusText}</Text>
                  </View>
                </View>
                <View style={styles.contactCardRight}>
                  {canInvite && (
                    <Pressable
                      style={styles.inviteButton}
                      onPress={() => handleInviteContact(contact)}
                    >
                      <Ionicons name="send" size={16} color="#ffffff" />
                      <Text style={styles.inviteButtonText}>Invite</Text>
                    </Pressable>
                  )}
                  {contact.invited_at && !contact.joined_at && (
                    <Text style={styles.invitedLabel}>Invited</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8b98a5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b98a5',
  },
  syncButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#2a3744',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1c2631',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8b98a5',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b98a5',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8b98a5',
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  contactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  contactStatus: {
    fontSize: 13,
    color: '#8b98a5',
  },
  contactCardRight: {
    marginLeft: 12,
  },
  inviteButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  invitedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff9800',
  },
});
