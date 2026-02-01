import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type DirectiveWithProgress = {
  id: string;
  title: string;
  body: string | null;
  target_goal: number;
  current_salvos: number;
  created_at: string;
  is_completed: boolean;
};

interface DirectiveCardProps {
  directive: DirectiveWithProgress;
}

export function DirectiveCard({ directive }: DirectiveCardProps) {
  const router = useRouter();
  const progress = Math.min((directive.current_salvos / directive.target_goal) * 100, 100);
  const isComplete = directive.is_completed || progress >= 100;


  // Format timestamp (e.g., "2H AGO", "15M AGO")
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}D AGO`;
    if (diffHours > 0) return `${diffHours}H AGO`;
    if (diffMins > 0) return `${diffMins}M AGO`;
    return 'JUST NOW';
  };

  const handlePress = () => {
    router.push(`/directive/${directive.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mb-3 mx-4 p-4 rounded-lg"
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        backgroundColor: '#1a1a1a',
        borderColor: isComplete ? '#00ff88' : '#333333',
        borderWidth: isComplete ? 2 : 1,
      })}
    >
      {/* Header: Timestamp */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          {isComplete && (
            <View className="flex-row items-center mb-1">
              <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#00ff88' }} />
              <Text className="text-xs font-bold tracking-wider" style={{ color: '#00ff88' }}>
                OBJECTIVE COMPLETE
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
          {getTimeAgo(directive.created_at)}
        </Text>
      </View>

      {/* Title - War Log Style */}
      <Text 
        className="text-xl font-bold tracking-tight mb-2"
        style={{ color: isComplete ? '#00ff88' : '#ffffff' }}
        numberOfLines={2}
      >
        {directive.title.toUpperCase()}
      </Text>

      {/* Body/Description */}
      {directive.body && (
        <Text 
          className="text-sm leading-5 mb-3"
          style={{ color: '#a0a0a0' }}
          numberOfLines={2}
        >
          {directive.body}
        </Text>
      )}

      {/* Pillage Meter */}
      <View className="mt-2">
        {/* Label */}
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
            PILLAGE METER
          </Text>
          <Text 
            className="text-xs font-mono font-bold tracking-wider"
            style={{ color: isComplete ? '#00ff88' : '#ffffff' }}
          >
            {directive.current_salvos.toLocaleString()} / {directive.target_goal.toLocaleString()}
          </Text>
        </View>

        {/* Progress Bar Container */}
        <View className="h-2 rounded-full overflow-hidden border" style={{ backgroundColor: '#1a1a1a', borderColor: '#333333' }}>
          {/* Progress Fill */}
          <View
            className="h-full"
            style={{ 
              width: `${progress}%`,
              backgroundColor: isComplete ? '#00ff88' : '#ff6b35'
            }}
          />
        </View>

        {/* Percentage */}
        <Text 
          className="text-right text-xs font-mono mt-1"
          style={{ color: isComplete ? '#00ff88' : '#a0a0a0' }}
        >
          {progress.toFixed(1)}%
        </Text>
      </View>

      {/* Completion Indicator Glow Effect */}
      {isComplete && (
        <View 
          className="absolute rounded-lg border-2 pointer-events-none"
          style={{ 
            top: -1, 
            left: -1, 
            right: -1, 
            bottom: -1,
            borderColor: 'rgba(0, 255, 136, 0.3)'
          }} 
        />
      )}
    </Pressable>
  );
}
