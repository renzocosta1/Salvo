import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchDirectivesForUser, subscribeToSalvos } from '../lib/supabase/directives';
import type { DirectiveWithProgress } from '../lib/supabase/types';

export function useDirectives() {
  const { profile } = useAuth();
  const [directives, setDirectives] = useState<DirectiveWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDirectives = useCallback(async () => {
    if (!profile) {
      console.log('[useDirectives] No profile, skipping fetch');
      setDirectives([]);
      setLoading(false);
      return;
    }

    console.log('[useDirectives] Fetching directives for user:', profile.id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDirectives.ts:22',message:'Fetching directives',data:{userId:profile.id,partyId:profile.party_id,county:profile.county,legislative_district:profile.legislative_district},timestamp:Date.now(),hypothesisId:'PARTY'})}).catch(()=>{});
    // #endregion
    try {
      const { data, error: fetchError } = await fetchDirectivesForUser(profile);
      
      if (fetchError) {
        console.error('[useDirectives] Error fetching directives:', fetchError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDirectives.ts:32',message:'Fetch error',data:{error:fetchError.message},timestamp:Date.now(),hypothesisId:'PARTY'})}).catch(()=>{});
        // #endregion
        setError(fetchError);
        setDirectives([]);
      } else {
        console.log('[useDirectives] Directives fetched successfully:', data?.length || 0, 'items');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDirectives.ts:40',message:'Directives fetched',data:{count:data?.length,titles:data?.map(d=>d.title)},timestamp:Date.now(),hypothesisId:'PARTY'})}).catch(()=>{});
        // #endregion
        setDirectives(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('[useDirectives] Unexpected error:', err);
      setError(err as Error);
      setDirectives([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  // Initial load
  useEffect(() => {
    loadDirectives();
  }, [loadDirectives]);

  // Real-time subscription
  useEffect(() => {
    if (!profile || directives.length === 0) {
      return;
    }

    const directiveIds = directives.map(d => d.id);
    
    const channel = subscribeToSalvos(directiveIds, (payload) => {
      // When a new salvo is inserted, increment the count for that directive
      const directiveId = payload.new.directive_id;
      const userId = payload.new.user_id;
      
      // Note: For the command feed, we DO want to show all updates including our own
      // because we navigate away after raiding, so there's no double-count issue here
      console.log('[useDirectives] Real-time update for directive:', directiveId, 'from user:', userId);
      
      setDirectives(prev =>
        prev.map(directive => {
          if (directive.id === directiveId) {
            const newCount = directive.current_salvos + 1;
            return {
              ...directive,
              current_salvos: newCount,
              is_completed: newCount >= directive.target_goal,
            };
          }
          return directive;
        })
      );
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [profile, directives.map(d => d.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadDirectives();
  }, [loadDirectives]);

  return {
    directives,
    loading,
    error,
    refreshing,
    refresh,
  };
}
