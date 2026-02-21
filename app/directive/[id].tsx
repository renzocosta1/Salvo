import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

/**
 * Redirect /directive/[id] to /(tabs)/mission/[id] so all users get the full
 * Task 29 mission flow (GPS, photo upload, Maps) instead of the old tap/raid UI.
 * Fixes PWA showing old cached flow when links pointed to directive.
 */
export default function DirectiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace({
        pathname: '/(tabs)/mission/[id]' as any,
        params: { id },
      });
    }
  }, [id, router]);

  return null;
}
