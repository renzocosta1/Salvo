import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileEditScreen() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [addressLine1, setAddressLine1] = useState(profile?.address_line1 || '');
  const [city, setCity] = useState(profile?.city || '');
  const [state, setState] = useState(profile?.state || 'Maryland');
  const [zipCode, setZipCode] = useState(profile?.zip_code || '');
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;

    if (!displayName.trim()) {
      const msg = 'Please enter a display name';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Required', msg);
      }
      return;
    }

    setSaving(true);

    try {
      const updates: any = {
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      };

      // Update address if changed
      if (addressLine1.trim() !== profile.address_line1 || 
          city.trim() !== profile.city || 
          zipCode.trim() !== profile.zip_code) {
        
        updates.address_line1 = addressLine1.trim();
        updates.city = city.trim();
        updates.state = state;
        updates.zip_code = zipCode.trim();
        
        // TODO: Geocode address to get county/district
        // For now, we'll let the backend handle this via a trigger or manual admin update
        // In production, call Google Civic API here to get district data
      }

      // Update profile pic if uploaded
      // NOTE: Requires Scripts/add_avatar_url_column.sql to be run first!
      // Temporarily disabled until SQL script is run
      // if (profilePicUrl) {
      //   updates.avatar_url = profilePicUrl;
      // }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      const msg = 'Profile updated successfully!';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }

      router.back();
    } catch (error) {
      console.error('[ProfileEdit] Error saving:', error);
      const msg = 'Failed to update profile';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        const msg = 'Camera roll permission is required';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Permission Required', msg);
        }
        return;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);

      // Upload to Supabase Storage
      const photo = result.assets[0];
      const fileExt = photo.uri.split('.').pop();
      const fileName = `${profile?.id}_avatar_${Date.now()}.${fileExt}`;

      // Convert to blob for web, use uri for native
      let fileData;
      if (Platform.OS === 'web') {
        const response = await fetch(photo.uri);
        fileData = await response.blob();
      } else {
        fileData = {
          uri: photo.uri,
          type: `image/${fileExt}`,
          name: fileName,
        };
      }

      // Upload to 'avatars' bucket
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileData as any);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfilePicUrl(urlData.publicUrl);

      const msg = 'Profile picture uploaded!';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }
    } catch (error) {
      console.error('[ProfileEdit] Image upload error:', error);
      const msg = 'Failed to upload image';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Profile Picture */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile Picture</Text>
          <Pressable 
            style={styles.avatarUpload} 
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="large" color="#39FF14" />
            ) : profilePicUrl || profile?.avatar_url ? (
              <View style={styles.avatarPreview}>
                <Ionicons name="person" size={60} color="#3498db" />
                <Text style={styles.avatarChangeText}>Tap to change</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={40} color="#8b98a5" />
                <Text style={styles.avatarPlaceholderText}>Upload Photo</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor="#8b98a5"
            maxLength={50}
          />
          <Text style={styles.hint}>This is how other warriors will see you</Text>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Address</Text>
          <Text style={styles.sectionDescription}>
            Update your address if you've moved. This will update your district and ballot.
          </Text>
          
          <TextInput
            style={styles.input}
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="Street address"
            placeholderTextColor="#8b98a5"
          />
          
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor="#8b98a5"
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor="#8b98a5"
              editable={false}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="ZIP Code"
              placeholderTextColor="#8b98a5"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <Text style={styles.hint}>
            ⚠️ Changing your address will update your district and ballot
          </Text>
        </View>

        {/* Current District Info */}
        <View style={styles.infoBox}>
          <Ionicons name="location" size={20} color="#39FF14" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Current District</Text>
            <Text style={styles.infoValue}>
              {profile?.county} County, District {profile?.legislative_district}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0f1419" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#0f1419" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </Pressable>

        {/* Cancel Button */}
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#8b98a5',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b98a5',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#8b98a5',
    marginBottom: 12,
    lineHeight: 18,
  },
  avatarUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1c2631',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3744',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPlaceholderText: {
    fontSize: 12,
    color: '#8b98a5',
  },
  avatarPreview: {
    alignItems: 'center',
    gap: 8,
  },
  avatarChangeText: {
    fontSize: 11,
    color: '#39FF14',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1c2631',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a3744',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#8b98a5',
    marginTop: -8,
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1c2631',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8b98a5',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#39FF14',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1419',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b98a5',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
});
