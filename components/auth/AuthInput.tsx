import React from 'react';
import { TextInput, Text, View, TextInputProps } from 'react-native';

type AuthInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthInput({ label, error, ...props }: AuthInputProps) {
  return (
    <View className="mb-4">
      <Text className="text-white text-sm font-semibold mb-2 uppercase tracking-wide">
        {label}
      </Text>
      <TextInput
        className={`bg-neutral-900 text-white px-4 py-3 rounded border ${
          error ? 'border-red-500' : 'border-neutral-700'
        } focus:border-[#00FF41]`}
        placeholderTextColor="#666"
        autoCapitalize="none"
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}
