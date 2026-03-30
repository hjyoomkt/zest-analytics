import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // User metadata from users table
  const [role, setRole] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [advertiserId, setAdvertiserId] = useState(null);
  const [organizationType, setOrganizationType] = useState(null);
  const [userName, setUserName] = useState(null);

  // Account error state
  const [accountError, setAccountError] = useState(null);

  // Brand switching functionality
  const [availableAdvertisers, setAvailableAdvertisers] = useState([]);
  const [currentAdvertiserId, setCurrentAdvertiserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMetadata(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserMetadata(session.user.id);
        } else {
          // Clear metadata on logout
          setRole(null);
          setOrganizationId(null);
          setAdvertiserId(null);
          setOrganizationType(null);
          setUserName(null);
          setAvailableAdvertisers([]);
          setCurrentAdvertiserId(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserMetadata = async (userId) => {
    try {
      console.log('[AuthContext] Fetching user metadata for userId:', userId);

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          organization_id,
          advertiser_id,
          organization_type,
          status,
          deleted_at
        `)
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('[AuthContext] Error fetching user metadata:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('[AuthContext] User not found in users table');
        setLoading(false);
        return;
      }

      // Check account status
      if (data.status !== 'active') {
        console.error('Account is not active');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setRole(data.role);
      setOrganizationId(data.organization_id);
      setAdvertiserId(data.advertiser_id);
      setOrganizationType(data.organization_type);
      setUserName(data.name);

      console.log('✅ User metadata loaded successfully:', {
        role: data.role,
        organization_type: data.organization_type,
        advertiser_id: data.advertiser_id,
        organization_id: data.organization_id
      });

      // Fetch available advertisers based on role
      await fetchAvailableAdvertisers(data);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user metadata:', error);
      setLoading(false);
    }
  };

  const fetchAvailableAdvertisers = async (userData) => {
    try {
      let advertisers = [];

      if (userData.role === 'master') {
        // Master: all advertisers
        const { data, error } = await supabase
          .from('advertisers')
          .select('*')
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        advertisers = data || [];
      } else if (['agency_admin', 'agency_manager'].includes(userData.role)) {
        // Agency: all advertisers in the same organization
        if (userData.organization_id) {
          const { data, error } = await supabase
            .from('advertisers')
            .select('*')
            .eq('organization_id', userData.organization_id)
            .is('deleted_at', null)
            .order('name');
          if (error) throw error;
          advertisers = data || [];
        }
      } else if (['advertiser_admin', 'advertiser_staff', 'viewer'].includes(userData.role)) {
        // Advertiser: only their assigned brand (users.advertiser_id)
        if (userData.advertiser_id) {
          console.log('[AuthContext] Fetching advertiser with id:', userData.advertiser_id);
          const { data, error } = await supabase
            .from('advertisers')
            .select('*')
            .eq('id', userData.advertiser_id)
            .is('deleted_at', null);
          if (error) {
            console.error('[AuthContext] Error fetching advertiser:', error);
          } else {
            console.log('[AuthContext] Advertiser query result:', data);
            advertisers = data || [];
          }
        }
      }

      console.log('[AuthContext] Setting availableAdvertisers:', advertisers);
      setAvailableAdvertisers(advertisers);

      // Set initial currentAdvertiserId
      if (advertisers.length > 0) {
        const savedBrandId = localStorage.getItem('selectedBrandId');
        const hasAccess = advertisers.some(adv => adv.id === savedBrandId);

        if (savedBrandId && hasAccess) {
          setCurrentAdvertiserId(savedBrandId);
        } else {
          setCurrentAdvertiserId(advertisers[0].id);
          localStorage.setItem('selectedBrandId', advertisers[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching available advertisers:', error);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) return { data: null, error };

    // Fetch user metadata after sign in
    if (data.user) {
      await fetchUserMetadata(data.user.id);
    }

    return { data, error: null };
  };

  const signUp = async (email, password, inviteCode = null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          invite_code: inviteCode
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Permission check functions
  const isMaster = () => role === 'master';

  const canAccessSuperAdmin = () => {
    const hasAccess = ['master', 'agency_admin', 'agency_manager'].includes(role);
    console.log('🔍 canAccessSuperAdmin check:', { role, hasAccess });
    return hasAccess;
  };

  const canAccessBrandAdmin = () => {
    return ['master', 'advertiser_admin', 'advertiser_staff'].includes(role);
  };

  const canInvite = () => {
    return ['master', 'agency_admin', 'agency_manager', 'advertiser_admin', 'advertiser_staff'].includes(role);
  };

  const isAgency = () => {
    return ['agency_admin', 'agency_manager'].includes(role);
  };

  const isAdvertiser = () => {
    return ['advertiser_admin', 'advertiser_staff', 'viewer'].includes(role);
  };

  const isAdvertiserAdmin = () => {
    return role === 'advertiser_admin';
  };

  // Brand switching function
  const switchAdvertiser = (advertiserId) => {
    setCurrentAdvertiserId(advertiserId);

    if (advertiserId) {
      localStorage.setItem('selectedBrandId', advertiserId);
    } else {
      localStorage.removeItem('selectedBrandId');
    }

    console.log('Switched to advertiser:', advertiserId || 'All');
  };

  // Clear account error
  const clearAccountError = () => {
    setAccountError(null);
  };

  const value = {
    user,
    loading,
    role,
    organizationId,
    advertiserId,
    organizationType,
    userName,
    signIn,
    signUp,
    signOut,
    // Permission functions
    isMaster,
    canAccessSuperAdmin,
    canAccessBrandAdmin,
    canInvite,
    isAgency,
    isAdvertiser,
    isAdvertiserAdmin,
    // Brand switching
    availableAdvertisers,
    currentAdvertiserId,
    switchAdvertiser,
    // Account error
    accountError,
    clearAccountError,
    // Placeholder for notifications (can be added later)
    allNotifications: [],
    markNotificationAsRead: () => {},
    markAllNotificationsAsRead: () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
