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
      role: user.user_metadata?.role || "user"
    });
    const fetchSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (activeSession) {
        setSession({ user: formatUser(activeSession.user) });
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (activeSession) {
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
  if (error) return { error: error.message };
  
  if (data?.user && options.role) {
    if (data.user.user_metadata?.role !== options.role) {
      await supabase.auth.updateUser({
        data: { role: options.role }
      });
    }
  }
  
  return { ok: true, error: null };
}
