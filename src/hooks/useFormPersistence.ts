import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  [key: string]: any;
}

interface FormPersistenceOptions {
  formType: 'single_service' | 'multi_service';
  expiryDuration?: number; // in minutes, default 10
}

export function useFormPersistence({ formType, expiryDuration = 10 }: FormPersistenceOptions) {
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID
    let id = localStorage.getItem('formSessionId');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('formSessionId', id);
    }
    return id;
  });

  const saveFormData = useCallback(async (formData: FormData) => {
    const expiryTime = Date.now() + (expiryDuration * 60 * 1000);
    
    // Save to localStorage first (fast, local backup)
    try {
      localStorage.setItem(`formData_${formType}`, JSON.stringify({
        data: formData,
        expiresAt: expiryTime,
        sessionId
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }

    // Save to database (persistent backup for cross-session recovery)
    try {
      const { error } = await supabase
        .from('temporary_form_data')
        .upsert({
          session_id: sessionId,
          form_type: formType,
          form_data: formData,
          expires_at: new Date(expiryTime).toISOString()
        }, {
          onConflict: 'session_id,form_type'
        });

      if (error) {
        console.warn('Failed to save to database:', error);
      }
    } catch (error) {
      console.warn('Database save error:', error);
    }
  }, [sessionId, formType, expiryDuration]);

  const loadFormData = useCallback(async (): Promise<FormData | null> => {
    // Try localStorage first (faster)
    try {
      const localData = localStorage.getItem(`formData_${formType}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.expiresAt > Date.now() && parsed.sessionId === sessionId) {
          return parsed.data;
        } else {
          // Expired or different session, remove it
          localStorage.removeItem(`formData_${formType}`);
        }
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }

    // Try database as fallback
    try {
      const { data, error } = await supabase
        .from('temporary_form_data')
        .select('form_data, expires_at')
        .eq('session_id', sessionId)
        .eq('form_type', formType)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.warn('Database load error:', error);
        }
        return null;
      }

      return (data?.form_data as FormData) || null;
    } catch (error) {
      console.warn('Database load error:', error);
      return null;
    }
  }, [sessionId, formType]);

  const clearFormData = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(`formData_${formType}`);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    // Clear database
    try {
      await supabase
        .from('temporary_form_data')
        .delete()
        .eq('session_id', sessionId)
        .eq('form_type', formType);
    } catch (error) {
      console.warn('Failed to clear database:', error);
    }
  }, [sessionId, formType]);

  const checkForRestoredData = useCallback(async (): Promise<FormData | null> => {
    // Check if user just logged in and has saved form data
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is logged in, check for any saved form data from this session
      return await loadFormData();
    }
    
    return null;
  }, [loadFormData]);

  return {
    sessionId,
    saveFormData,
    loadFormData,
    clearFormData,
    checkForRestoredData
  };
}