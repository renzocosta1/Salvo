import { useAuth } from '@/lib/auth';
import {
    fetchMissionById,
    startMission,
    submitMissionProof,
    uploadMissionProof,
    type MissionWithUserStatus,
} from '@/lib/supabase/missions';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [mission, setMission] = useState<MissionWithUserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadMission();
  }, [id]);

  const loadMission = async () => {
    if (!id || !profile) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fetchMissionById(id, profile.id);

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setMission(data);
        // If there's a submitted proof, show it
        if (data.user_mission?.proof_photo_url) {
          setSelectedImage(data.user_mission.proof_photo_url);
        }
      } else {
        setError('Mission not found');
      }
    } catch (err) {
      setError('Failed to load mission');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMission = async () => {
    if (!mission || !profile) return;

    try {
      const { data, error: startError } = await startMission(profile.id, mission.id);

      if (startError) {
        Alert.alert('Error', startError.message);
      } else if (data) {
        // Update local state
        setMission({
          ...mission,
          user_mission: data,
        });
        Alert.alert('Mission Started!', 'Good luck, warrior! 💪');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to start mission');
    }
  };

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll access to upload proof.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access to take a photo.');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!mission?.user_mission || !selectedImage || !profile) return;

    setUploading(true);

    try {
      // Upload image to Supabase Storage
      const { url, error: uploadError } = await uploadMissionProof(
        mission.user_mission.id,
        profile.id,
        selectedImage
      );

      if (uploadError || !url) {
        Alert.alert('Upload Failed', uploadError?.message || 'Failed to upload image');
        setUploading(false);
        return;
      }

      // Update user_mission with proof URL and status 'submitted'
      const { success, error: submitError } = await submitMissionProof(
        mission.user_mission.id,
        url
      );

      if (submitError || !success) {
        Alert.alert('Submit Failed', submitError?.message || 'Failed to submit proof');
        setUploading(false);
        return;
      }

      // Success!
      Alert.alert(
        'Proof Submitted!',
        '🎯 Your proof has been submitted for verification. Check back soon!',
        [
          {
            text: 'CONTINUE',
            onPress: () => {
              // Reload mission to show updated status
              loadMission();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#00ff88',
          }}
        />
        <View className="flex-1 bg-tactical-bg justify-center items-center">
          <ActivityIndicator size="large" color="#00ff88" />
          <Text className="mt-4 text-sm font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
            LOADING MISSION...
          </Text>
        </View>
      </>
    );
  }

  if (error || !mission) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Error',
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#00ff88',
          }}
        />
        <View className="flex-1 bg-tactical-bg justify-center items-center px-8">
          <Text className="text-xl font-bold text-center mb-2" style={{ color: '#ff4444' }}>
            MISSION NOT FOUND
          </Text>
          <Text className="text-center text-sm" style={{ color: '#a0a0a0' }}>
            {error || 'Unable to load mission data'}
          </Text>
        </View>
      </>
    );
  }

  const userMission = mission.user_mission;
  const canStart = !userMission;
  const canSubmit = userMission?.status === 'pending' && selectedImage && !selectedImage.startsWith('http');
  const isSubmitted = userMission?.status === 'submitted';
  const isVerified = userMission?.status === 'verified';
  const isRejected = userMission?.status === 'rejected';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mission',
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#00ff88',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <View className="flex-1 bg-tactical-bg">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
        >
          {/* Status Badge */}
          {userMission && (
            <View
              className="mb-4 p-4 rounded-lg border-2"
              style={{
                backgroundColor:
                  isVerified ? 'rgba(0, 255, 136, 0.1)' :
                  isSubmitted ? 'rgba(255, 165, 0, 0.1)' :
                  isRejected ? 'rgba(255, 68, 68, 0.1)' :
                  'rgba(255, 255, 255, 0.05)',
                borderColor:
                  isVerified ? '#00ff88' :
                  isSubmitted ? '#ffa500' :
                  isRejected ? '#ff4444' :
                  '#666666',
              }}
            >
              <Text
                className="text-sm font-bold tracking-wider text-center"
                style={{
                  color:
                    isVerified ? '#00ff88' :
                    isSubmitted ? '#ffa500' :
                    isRejected ? '#ff4444' :
                    '#ffffff',
                }}
              >
                {isVerified ? '✓ VERIFIED' :
                 isSubmitted ? '⏳ PENDING VERIFICATION' :
                 isRejected ? '✗ REJECTED' :
                 '⚡ IN PROGRESS'}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text className="text-3xl font-bold tracking-tight mb-4" style={{ color: '#ffffff' }}>
            {mission.title.toUpperCase()}
          </Text>

          {/* Description */}
          {mission.description && (
            <Text className="text-base leading-6 mb-6" style={{ color: '#a0a0a0' }}>
              {mission.description}
            </Text>
          )}

          {/* XP Reward */}
          <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
            <Text className="text-xs font-mono tracking-wider mb-2" style={{ color: '#a0a0a0' }}>
              XP REWARD
            </Text>
            <Text className="text-2xl font-bold" style={{ color: '#00ff88' }}>
              +{mission.xp_reward} XP
            </Text>
          </View>

          {/* Photo Display */}
          {selectedImage && (
            <View className="mb-6">
              <Text className="text-xs font-mono tracking-wider mb-2" style={{ color: '#a0a0a0' }}>
                MISSION PROOF
              </Text>
              <Image
                source={{ uri: selectedImage }}
                style={{ width: '100%', height: 300, borderRadius: 8 }}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Action Buttons */}
          {canStart && (
            <Pressable
              onPress={handleStartMission}
              className="py-6 rounded-lg items-center justify-center mb-4"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#cc5428' : '#ff6b35',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text className="text-2xl font-bold tracking-wider" style={{ color: '#ffffff' }}>
                START MISSION
              </Text>
            </Pressable>
          )}

          {userMission?.status === 'pending' && !isSubmitted && (
            <>
              {!selectedImage && (
                <View className="space-y-4">
                  <Pressable
                    onPress={handleTakePhoto}
                    className="py-6 rounded-lg items-center justify-center mb-4"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#1a1a1a' : '#0a0a0a',
                      borderWidth: 2,
                      borderColor: '#00ff88',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text className="text-xl font-bold tracking-wider" style={{ color: '#00ff88' }}>
                      📸 TAKE PHOTO
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handlePickImage}
                    className="py-6 rounded-lg items-center justify-center"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#1a1a1a' : '#0a0a0a',
                      borderWidth: 2,
                      borderColor: '#00ff88',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text className="text-xl font-bold tracking-wider" style={{ color: '#00ff88' }}>
                      🖼️ CHOOSE FROM GALLERY
                    </Text>
                  </Pressable>
                </View>
              )}

              {canSubmit && (
                <Pressable
                  onPress={handleSubmitProof}
                  disabled={uploading}
                  className="py-6 rounded-lg items-center justify-center mt-4"
                  style={({ pressed }) => ({
                    backgroundColor: uploading ? '#666666' : (pressed ? '#cc5428' : '#ff6b35'),
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text className="text-2xl font-bold tracking-wider" style={{ color: '#ffffff' }}>
                    {uploading ? 'UPLOADING...' : 'SUBMIT PROOF'}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>

        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          className="absolute bottom-6 left-6 flex-row items-center px-4 py-3 rounded-lg"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1a1a1a' : '#0a0a0a',
            borderWidth: 2,
            borderColor: '#00ff88',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="text-2xl mr-2" style={{ color: '#00ff88' }}>←</Text>
          <Text className="font-bold tracking-wider" style={{ color: '#00ff88' }}>
            BACK
          </Text>
        </Pressable>
      </View>
    </>
  );
}
