import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, nombres: string, apellidos: string, tipoRegistro?: string, idCursillo?: string, telefono?: string, telefonoVisible?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback((nextSession: Session | null, preserveExistingUser = false) => {
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser((currentUser) => {
      if (preserveExistingUser && currentUser?.id && currentUser.id === nextUser?.id) {
        return currentUser;
      }

      return nextUser;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const shouldPreserveExistingUser =
          event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY';
        syncSession(session, shouldPreserveExistingUser);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    return () => subscription.unsubscribe();
  }, [syncSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nombres: string, apellidos: string, tipoRegistro: string = 'ESTUDIANTE', idCursillo?: string, telefono?: string, telefonoVisible: boolean = true) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const telefonoLimpio = telefono?.trim();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nombres,
          apellidos,
          tipo_registro: tipoRegistro,
          ...(telefonoLimpio ? { telefono: telefonoLimpio } : {}),
          telefono_visible: telefonoVisible,
          ...(idCursillo ? { id_cursillo: idCursillo } : {}),
        },
      },
    });

    // If signup was successful, send welcome email
    if (!error) {
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email,
            nombres: `${nombres} ${apellidos}`.trim(),
            tipo: 'bienvenida',
          },
        });
      } catch (emailError) {
        // Don't fail signup if email fails
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Even if signOut fails (e.g., session not found), clear local state
    }
    // Always clear local state regardless of API response
    setSession(null);
    setUser(null);
  };

  const resetPasswordForEmail = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPasswordForEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
