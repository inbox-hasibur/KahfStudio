import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export function useSession(options?: any) {
  const [session, setSession] = useState<{ user: User & { name?: string; image?: string } | null } | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const supabase = createClient();

  useEffect(() => {
    const formatUser = (user: User) => ({
      ...user,
      name: user.user_metadata?.full_name || user.email?.split('@')[0],
      image: user.user_metadata?.avatar_url,
      role: user.user_metadata?.role || "user",
      tier: user.user_metadata?.tier || "free",
      trial_days_left: user.user_metadata?.trial_days_left
    });
    const fetchSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (activeSession) {
        // Fetch latest profile to ensure tier/role are in sync with DB
        const { data: profile } = await supabase.from('profiles').select('tier, role').eq('id', activeSession.user.id).single();
        if (profile) {
          activeSession.user.user_metadata = {
            ...activeSession.user.user_metadata,
            tier: profile.tier,
            role: profile.role
          };
        }

        // Check trial expiration
        if (activeSession.user.user_metadata.tier === 'premium') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_type, valid_until, status')
            .eq('user_id', activeSession.user.id)
            .eq('status', 'trialing')
            .single();

          if (sub) {
            const validUntil = new Date(sub.valid_until);
            if (new Date() > validUntil) {
              // Trial expired!
              await fetch('/api/checkout/trial/expire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeSession.user.id })
              }).catch(() => {});
              
              activeSession.user.user_metadata.tier = 'free';
            } else {
              // Trial is still active, inject days remaining
              const diffTime = Math.abs(validUntil.getTime() - new Date().getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              activeSession.user.user_metadata.trial_days_left = diffDays;
            }
          }
        }
        
        setSession({ user: formatUser(activeSession.user) });
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
      if (activeSession) {
        // Fetch latest profile to ensure tier/role are in sync with DB
        const { data: profile } = await supabase.from('profiles').select('tier, role').eq('id', activeSession.user.id).single();
        if (profile) {
          activeSession.user.user_metadata = {
            ...activeSession.user.user_metadata,
            tier: profile.tier,
            role: profile.role
          };
        }
        // Check trial expiration
        if (activeSession.user.user_metadata.tier === 'premium') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_type, valid_until, status')
            .eq('user_id', activeSession.user.id)
            .eq('status', 'trialing')
            .single();

          if (sub) {
            const validUntil = new Date(sub.valid_until);
            if (new Date() > validUntil) {
              await fetch('/api/checkout/trial/expire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeSession.user.id })
              }).catch(() => {});
              
              activeSession.user.user_metadata.tier = 'free';
            } else {
              const diffTime = Math.abs(validUntil.getTime() - new Date().getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              activeSession.user.user_metadata.trial_days_left = diffDays;
            }
          }
        }
        
        setSession({ user: formatUser(activeSession.user) });
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data: session, status };
}

export async function signOut({ callbackUrl = '/' }: { callbackUrl?: string } = {}) {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = callbackUrl;
}

export async function signIn(provider: string, options: any) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: options.email,
    password: options.password
  });
  if (error) return { ok: false, error: error.message };
  
  if (data?.user) {
    // Fetch actual profile role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tier')
      .eq('id', data.user.id)
      .single();

    const actualRole = profile?.role || data.user.user_metadata?.role || "user";
    
    // Sync metadata
    data.user.user_metadata = {
      ...data.user.user_metadata,
      role: actualRole,
      tier: profile?.tier || data.user.user_metadata?.tier || "free"
    };

    if (options.role === "admin" && actualRole !== "admin") {
      await supabase.auth.signOut();
      return { ok: false, error: "This account does not have Admin access privileges." };
    }
  }
  
  return { ok: true, error: null };
}
