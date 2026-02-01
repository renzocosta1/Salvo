import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

export default function DirectiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Directive',
          headerStyle: {
            backgroundColor: '#0a0a0a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <View className="flex-1 bg-tactical-bg justify-center items-center px-8">
        <Text className="text-tactical-text text-2xl font-bold mb-4">
          DIRECTIVE DETAIL
        </Text>
        <Text className="text-tactical-textMuted text-center">
          Task #4 (Pillage Meter and Raid Action) coming soon.
        </Text>
        <Text className="text-tactical-green text-sm mt-4 font-mono">
          ID: {id}
        </Text>
      </View>
    </>
  );
}
