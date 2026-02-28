import { useAuth } from '@/lib/auth';
import { fetchDirectiveById } from '@/lib/supabase/directives';
import type { DirectiveWithProgress } from '@/lib/supabase/types';
import {
  uploadProofPhoto,
  verifyVotedSticker,
  recordElectionVerification,
  awardMissionXP,
  checkElectionVerification,
} from '@/lib/supabase/verification';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  
  const [mission, setMission] = useState<DirectiveWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    loadMission();
    checkVerificationStatus();
  }, [id]);

  const checkVerificationStatus = async () => {
    if (!profile?.id) return;
    
    const result = await checkElectionVerification(profile.id);
    if (result.verified) {
      setAlreadyVerified(true);
    }
  };

  const loadMission = async () => {
    if (!id) return;
    
    setLoading(true);
    const result = await fetchDirectiveById(id as string);
    
    if (result.data) {
      setMission(result.data);
    } else if (result.error) {
      Alert.alert('Error', 'Failed to load mission details');
    }
    
    setLoading(false);
  };

  const handleGetLocation = async () => {
    setCheckingLocation(true);

    try {
      if (Platform.OS === 'web') {
        // Web Geolocation API
        if (!navigator.geolocation) {
          Alert.alert('Error', 'Geolocation is not supported by your browser');
          setCheckingLocation(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            checkProximity(latitude, longitude);
            setCheckingLocation(false);
          },
          (error) => {
            Alert.alert('Location Error', error.message);
            setCheckingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      } else {
        // TODO: Native expo-location implementation
        Alert.alert('Coming Soon', 'Native location tracking will be available soon');
        setCheckingLocation(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location');
      setCheckingLocation(false);
    }
  };

  const checkProximity = (userLat: number, userLon: number) => {
    // Early Voting Centers in Montgomery County (sample coordinates)
    const earlyVotingCenters = [
      { name: 'Silver Spring Civic Center', lat: 38.9937, lon: -77.0261 },
      { name: 'Germantown Community Center', lat: 39.1732, lon: -77.2664 },
      { name: 'Wheaton Community Center', lat: 39.0392, lon: -77.0511 },
      // Add more centers as needed
    ];

    const isWithin100m = earlyVotingCenters.some((center) => {
      const distance = getDistanceInMeters(userLat, userLon, center.lat, center.lon);
      return distance <= 100;
    });

    if (isWithin100m) {
      Alert.alert(
        '✅ Location Verified',
        'You are at an Early Voting center! Now upload your "I Voted" sticker photo.',
        [{ text: 'Upload Photo', onPress: handlePhotoUpload }]
      );
    } else {
      Alert.alert(
        '⚠️ Not at Voting Center',
        'You must be within 100m of an Early Voting center to complete this mission.',
        [{ text: 'OK' }]
      );
    }
  };

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handlePhotoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Request camera on mobile browsers
        
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            await processPhoto(file);
          }
        };
        
        input.click();
      } else {
        // Native photo upload using expo-image-picker
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Please allow photo library access to upload photos');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing: false,
          quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]) {
          return;
        }

        const asset = result.assets[0];
        console.log('[Photo Upload] Native image picked:', asset.uri);

        // Fetch the image as a blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Create a File-like object from the blob
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        await processPhoto(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const processPhoto = async (file: File) => {
    if (!profile?.id || !mission) return;

    try {
      console.log('[Photo Upload] Starting process for file:', file.name, file.size, file.type);
      setUploadingPhoto(true);

      // Step 1: Upload photo to Supabase Storage
      const uploadResult = await uploadProofPhoto(
        profile.id,
        mission.mission_type || 'general',
        file
      );

      console.log('[Photo Upload] Upload result:', { 
        hasError: !!uploadResult.error, 
        errorMsg: uploadResult.error?.message,
        hasUrl: !!uploadResult.url,
        url: uploadResult.url 
      });

      if (uploadResult.error || !uploadResult.url) {
        const errorMsg = uploadResult.error?.message || 'Could not upload photo';
        console.error('[Photo Upload] Upload failed:', errorMsg);
        Alert.alert('Upload Failed', errorMsg + '\n\nMake sure the storage bucket exists in Supabase.');
        setUploadingPhoto(false);
        return;
      }

      console.log('[Photo Upload] ✅ Upload successful, starting verification...');
      setUploadingPhoto(false);
      setVerifying(true);

      // Step 2: Verify with Gemini AI
      let verifyResult;
      try {
        verifyResult = await verifyVotedSticker(
          uploadResult.url,
          mission.mission_type || 'general'
        );
      } catch (verifyError: any) {
        console.error('[Photo Upload] Verification threw error:', verifyError);
        setVerifying(false);
        Alert.alert(
          'Verification Error',
          `Exception during verification:\n\n${verifyError.message || verifyError}\n\nPhoto URL: ${uploadResult.url}`
        );
        return;
      }

      console.log('[Photo Upload] Verification result:', {
        success: verifyResult.success,
        verdict: verifyResult.verdict,
        confidence: verifyResult.confidence,
        error: verifyResult.error,
        reasoning: verifyResult.reasoning
      });

      setVerifying(false);

      if (!verifyResult.success) {
        const errorMsg = verifyResult.error || 'Could not verify photo';
        console.error('[Photo Upload] Verification failed:', errorMsg);
        
        // SHOW THE FULL ERROR TO USER
        Alert.alert(
          'DEBUG: Verification Failed', 
          `Error: ${errorMsg}\n\nPhoto URL: ${uploadResult.url}\n\nThis error will help us debug the issue.`
        );
        return;
      }

      console.log('[Photo Upload] ✅ Verification complete');

      // Step 3: Check verdict
      if (verifyResult.verdict) {
        // SUCCESS: Photo verified!
        
        // Record verification in database
        const recordResult = await recordElectionVerification(
          profile.id,
          uploadResult.url,
          false // TODO: Check if they voted for all endorsed candidates
        );

        if (recordResult.error) {
          Alert.alert('Database Error', 'Verification succeeded but could not save record');
          return;
        }

        // Award XP
        const xpAmount = mission.mission_type === 'ELECTION_DAY_SIEGE' ? 250 : 200;
        await awardMissionXP(profile.id, xpAmount);

        Alert.alert(
          '🎉 MISSION COMPLETE!',
          `Your "I Voted" sticker has been verified!\n\n+${xpAmount} XP awarded!\n\nConfidence: ${Math.round((verifyResult.confidence || 0) * 100)}%\n\n${verifyResult.reasoning}`,
          [{ text: 'Back to Missions', onPress: () => router.back() }]
        );

        setAlreadyVerified(true);
      } else {
        // REJECTED: Photo not valid
        Alert.alert(
          '⚠️ Verification Failed',
          `Your photo could not be verified.\n\nReason: ${verifyResult.reasoning}\n\nConfidence: ${Math.round((verifyResult.confidence || 0) * 100)}%\n\nPlease try again with a clearer photo of your "I Voted" sticker.`,
          [{ text: 'Try Again', onPress: handlePhotoUpload }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify photo');
      setUploadingPhoto(false);
      setVerifying(false);
    }
  };

  const handleOpenMaps = () => {
    if (!profile) return;

    // Mock precinct coordinates for Montgomery County
    const precinctLat = 39.0458;
    const precinctLon = -77.0198;

    // Use web URL - works on all platforms without App Store redirects
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${precinctLat},${precinctLon}`;

    // Open in new tab/window to avoid iOS interception
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(googleMapsUrl, '_blank');
    } else {
      Linking.openURL(googleMapsUrl).catch((err) => {
        console.error('Failed to open Maps:', err);
        Alert.alert('Error', 'Could not open Google Maps');
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (!mission) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Mission not found</Text>
      </View>
    );
  }

  const isEarlyRaid = mission.mission_type === 'EARLY_RAID';
  const isElectionDaySiege = mission.mission_type === 'ELECTION_DAY_SIEGE';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{mission.title}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Mission Brief */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 MISSION BRIEF</Text>
          <Text style={styles.briefText}>{mission.body}</Text>
        </View>

        {/* Mission Actions */}
        {isEarlyRaid && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ EARLY RAID ACTIONS</Text>
            
            {alreadyVerified ? (
              <View style={styles.completedCard}>
                <Text style={styles.completedIcon}>✅</Text>
                <Text style={styles.completedText}>Mission Complete!</Text>
                <Text style={styles.completedSubtext}>You've already verified your vote</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                    checkingLocation && styles.actionButtonDisabled,
                  ]}
                  onPress={handleGetLocation}
                  disabled={checkingLocation}
                >
                  {checkingLocation ? (
                    <ActivityIndicator color="#0f1419" />
                  ) : (
                    <>
                      <Text style={styles.actionButtonText}>📍 Check GPS Location</Text>
                      <Text style={styles.actionButtonSubtext}>Verify you're at an Early Voting center</Text>
                    </>
                  )}
                </Pressable>

                {userLocation && (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationText}>
                      Your Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {isElectionDaySiege && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 ELECTION DAY ACTIONS</Text>
            
            {alreadyVerified ? (
              <View style={styles.completedCard}>
                <Text style={styles.completedIcon}>✅</Text>
                <Text style={styles.completedText}>Mission Complete!</Text>
                <Text style={styles.completedSubtext}>You've already verified your vote</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  onPress={handleOpenMaps}
                >
                  <Text style={styles.actionButtonText}>🗺️ Navigate to Polling Place</Text>
                  <Text style={styles.actionButtonSubtext}>Open Google Maps with directions</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonSecondary,
                    pressed && styles.actionButtonPressed,
                    (uploadingPhoto || verifying) && styles.actionButtonDisabled,
                  ]}
                  onPress={handlePhotoUpload}
                  disabled={uploadingPhoto || verifying}
                >
                  {uploadingPhoto ? (
                    <>
                      <ActivityIndicator color="#0f1419" />
                      <Text style={[styles.actionButtonSubtext, { marginTop: 8 }]}>Uploading photo...</Text>
                    </>
                  ) : verifying ? (
                    <>
                      <ActivityIndicator color="#0f1419" />
                      <Text style={[styles.actionButtonSubtext, { marginTop: 8 }]}>Verifying with AI...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.actionButtonText}>📸 Upload "I Voted" Photo</Text>
                      <Text style={styles.actionButtonSubtext}>Prove you completed the mission</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 SQUAD PROGRESS</Text>
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>District Completion</Text>
            <Text style={styles.progressValue}>
              {mission.current_salvos} / {mission.target_goal}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(100, (mission.current_salvos / mission.target_goal) * 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1a1f26',
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#8b98a5',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ff00',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  briefText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: '#00ff00',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#2196f3',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1419',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: '#0f1419',
    opacity: 0.8,
  },
  locationInfo: {
    backgroundColor: '#1a1f26',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#8b98a5',
    fontFamily: 'monospace',
  },
  progressCard: {
    backgroundColor: '#1a1f26',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  progressLabel: {
    fontSize: 14,
    color: '#8b98a5',
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2d3748',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ff00',
  },
  completedCard: {
    backgroundColor: '#00ff0022',
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  completedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completedText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00ff00',
    marginBottom: 4,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#8b98a5',
  },
});
