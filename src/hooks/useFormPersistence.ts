/**
 * useFormPersistence.ts - Form Data Persistence Hook
 * 
 * OVERVIEW:
 * A custom React hook that provides automatic form data persistence across browser
 * sessions and page refreshes. It uses a dual-storage approach with localStorage
 * for fast access and Supabase database for cross-session recovery.
 * 
 * FEATURES:
 * 1. Dual Storage Strategy - localStorage (fast) + database (persistent)
 * 2. Session Management - Unique session IDs for data isolation
 * 3. Automatic Expiry - Configurable expiration times for data cleanup
 * 4. Cross-Session Recovery - Restore data after login/logout cycles
 * 5. Error Resilience - Graceful fallbacks when storage fails
 * 
 * USE CASES:
 * - Multi-step form wizards that shouldn't lose progress
 * - Draft saving for complex request submissions
 * - User experience continuity across browser sessions
 * - Recovery from accidental page refreshes or navigation
 * 
 * STORAGE STRATEGY:
 * 1. Primary: localStorage for immediate access and offline capability
 * 2. Backup: Supabase database for cross-session and cross-device access
 * 3. Fallback: Graceful degradation when either storage method fails
 * 
 * DATA LIFECYCLE:
 * Save → localStorage + Database → Load (localStorage first, then DB) → Auto-expire
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * FormData Interface
 * 
 * Generic interface for form data that can contain any form fields.
 * Provides type safety while maintaining flexibility for different form structures.
 */
interface FormData {
  [key: string]: any;
}

/**
 * FormPersistenceOptions Interface
 * 
 * Configuration options for the form persistence hook.
 * 
 * @param formType - Type of form being persisted ('single_service' | 'multi_service')
 * @param expiryDuration - How long to keep data (in minutes, default: 10)
 */
interface FormPersistenceOptions {
  formType: 'single_service' | 'multi_service';
  expiryDuration?: number; // in minutes, default 10
}

/**
 * useFormPersistence Hook
 * 
 * PARAMETERS:
 * @param formType - Type of form ('single_service' | 'multi_service')
 * @param expiryDuration - Data expiration time in minutes (default: 10)
 * 
 * RETURNS:
 * - sessionId: Unique identifier for this form session
 * - saveFormData: Function to persist form data
 * - loadFormData: Function to retrieve saved form data
 * - clearFormData: Function to remove saved form data
 * - checkForRestoredData: Function to check for recoverable data after login
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * const { saveFormData, loadFormData, clearFormData } = useFormPersistence({
 *   formType: 'single_service',
 *   expiryDuration: 15
 * });
 * 
 * // Save form data
 * await saveFormData(formValues);
 * 
 * // Load saved data
 * const savedData = await loadFormData();
 * 
 * // Clear saved data
 * await clearFormData();
 * ```
 */
export function useFormPersistence({ formType, expiryDuration = 10 }: FormPersistenceOptions) {
  /**
   * Session ID Management
   * 
   * Creates or retrieves a unique session identifier for this form instance.
   * The session ID persists across page refreshes but is unique per browser session.
   * 
   * FORMAT: session_{timestamp}_{randomString}
   * STORAGE: localStorage for persistence across page refreshes
   * LIFECYCLE: Created once per browser session, cleared on browser close
   */
  const [sessionId] = useState(() => {
    // Attempt to retrieve existing session ID from localStorage
    let id = localStorage.getItem('formSessionId');
    if (!id) {
      // Generate new unique session ID if none exists
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