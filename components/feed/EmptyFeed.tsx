import React from 'react';
import { View, Text } from 'react-native';

export function EmptyFeed() {
  return (
    <View className="flex-1 justify-center items-center px-8 bg-tactical-bg">
      {/* Icon/Visual */}
      <View className="w-20 h-20 rounded-full bg-tactical-bgSecondary border-2 border-tactical-border items-center justify-center mb-6">
        <View className="w-12 h-12 border-2 border-tactical-textMuted rounded-lg" />
      </View>

      {/* Heading */}
      <Text style={{color: '#ffffff'}} className="text-2xl font-bold tracking-tight text-center mb-3">
        NO ACTIVE DIRECTIVES
      </Text>

      {/* Subtext */}
      <Text style={{color: '#a0a0a0'}} className="text-center text-base leading-6 max-w-sm">
        Command feed is empty. Await orders from your General or Captain.
      </Text>

      {/* Status Indicator */}
      <View className="mt-8 flex-row items-center">
        <View className="w-2 h-2 rounded-full" style={{backgroundColor: '#00ff88'}} />
        <Text style={{color: '#a0a0a0'}} className="text-xs font-mono tracking-wider ml-2">
          STANDING BY
        </Text>
      </View>
    </View>
  );
}
