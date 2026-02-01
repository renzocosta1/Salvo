import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

type AuthButtonProps = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AuthButton({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`py-4 rounded ${
        isDisabled
          ? 'bg-neutral-700'
          : isPrimary
          ? 'bg-[#00FF41]'
          : 'bg-neutral-800 border border-neutral-600'
      } flex-row justify-center items-center`}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000' : '#fff'} />
      ) : (
        <Text
          className={`font-bold text-base uppercase tracking-wider ${
            isDisabled
              ? 'text-neutral-500'
              : isPrimary
              ? 'text-black'
              : 'text-white'
          }`}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
