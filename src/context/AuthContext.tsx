import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { User, FarmerProfile, UserRole } from '../types';
import { api, setStoredToken, clearStoredToken } from '../services/api';
import { realtimeService } from '../services/realtimeService';
import {
  auth,
  authenticateWithFirebaseGooglePopup,
  ensureFirebaseAuthWithEmail,
  getUserFromFirestore,
  saveUserToFirestore,
  getFarmerProfileFromCloud,
  saveFarmerProfileToCloud
} from '../lib/firestoreService';

interface AuthContextType {
  user: User | null;
  farmerProfile: FarmerProfile | null;
  role: UserRole;
  isLoading: boolean;
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  login: (
    email?: string,
    password?: string,
    mobile?: string,
    role?: UserRole,
    fullName?: string,
    state?: string,
    district?: string,
    village?: string,
    isGoogleAuth?: boolean,
    googleProfile?: { email: string; name: string }
  ) => Promise<User>;
  loginWithGoogle: (
    email?: string,
    name?: string,
    role?: UserRole,
    mobile?: string
  ) => Promise<User>;
  register: (data: Partial<User>) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  updateFarmerProfile: (profile: Partial<FarmerProfile>) => Promise<void>;
  updateUserProfile: (profile: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const notifs = await api.getNotifications();
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch {
      // ignore
    }
  }, []);

  // Real-time synchronization for instant notification count updates
  useEffect(() => {
    const unsubNotif = realtimeService.on('NOTIFICATION_CREATED', (ev) => {
      const notifUserId = ev.payload?.userId || ev.payload?.notification?.userId;
      const currentId = user?.id || 'USER-FARMER-1';
      if (!notifUserId || notifUserId === currentId) {
        setUnreadCount(prev => prev + 1);
      }
    });

    const unsubStatus = realtimeService.on('APPLICATION_STATUS_UPDATED', (ev) => {
      const appUserId = ev.payload?.userId || ev.payload?.application?.userId;
      const currentId = user?.id || 'USER-FARMER-1';
      if (!appUserId || appUserId === currentId) {
        fetchUnread();
      }
    });

    const unsubNotifUpdated = realtimeService.on('NOTIFICATION_UPDATED', () => {
      fetchUnread();
    });

    return () => {
      unsubNotif();
      unsubStatus();
      unsubNotifUpdated();
    };
  }, [user?.id, fetchUnread]);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.getMe();
      let currentUser = data.user;
      let currentFarmerProfile = data.farmerProfile;

      // Sync with Firestore data if user is logged in
      if (currentUser?.id) {
        try {
          const cloudUser = await getUserFromFirestore(currentUser.id);
          if (cloudUser) {
            currentUser = { ...currentUser, ...cloudUser };
          }
          const cloudProfile = await getFarmerProfileFromCloud(currentUser.id);
          if (cloudProfile) {
            currentFarmerProfile = { ...(currentFarmerProfile || {}), ...cloudProfile } as FarmerProfile;
          }
        } catch (cloudErr) {
          console.warn('Firestore initial profile fetch deferred:', cloudErr);
        }
      }

      setUser(currentUser);
      setFarmerProfile(currentFarmerProfile);
      fetchUnread();
    } catch {
      // When not logged in or token invalid, check if Firebase Auth has an active session
      if (auth.currentUser) {
        try {
          const cloudUser = await getUserFromFirestore(auth.currentUser.uid);
          const cloudProfile = await getFarmerProfileFromCloud(auth.currentUser.uid);
          if (cloudUser) {
            setUser(cloudUser);
            setFarmerProfile(cloudProfile);
          } else {
            setUser(null);
            setFarmerProfile(null);
          }
        } catch {
          setUser(null);
          setFarmerProfile(null);
        }
      } else {
        setUser(null);
        setFarmerProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnread]);

  // Listen to Firebase Auth state transitions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Authenticated in Firebase Auth, ensure Firestore user document exists
        try {
          const cloudUser = await getUserFromFirestore(fbUser.uid);
          if (cloudUser) {
            setUser(prev => ({ ...(prev || cloudUser), ...cloudUser, id: fbUser.uid }));
          }
          const cloudProfile = await getFarmerProfileFromCloud(fbUser.uid);
          if (cloudProfile) {
            setFarmerProfile(prev => ({ ...(prev || cloudProfile), ...cloudProfile }));
          }
        } catch (e) {
          console.warn('Firebase onAuthStateChanged sync:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (
    email?: string,
    password?: string,
    mobile?: string,
    role: UserRole = 'FARMER',
    fullName?: string,
    state?: string,
    district?: string,
    village?: string,
    isGoogleAuth?: boolean,
    googleProfile?: { email: string; name: string }
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const targetEmail = googleProfile?.email || email || '';

      // 1. Authenticate with Firebase Auth first or ensure auth user exists
      let fbUid: string | undefined = auth.currentUser?.uid;
      if (!isGoogleAuth && targetEmail) {
        const fbRes = await ensureFirebaseAuthWithEmail(targetEmail, password, fullName);
        if (fbRes?.uid) fbUid = fbRes.uid;
      }

      // 2. Call backend login API
      const res = await api.login({
        email: targetEmail,
        password,
        mobile,
        role,
        fullName,
        state,
        district,
        village,
        isGoogleAuth,
        googleProfile
      });

      // 3. Resolve permanent UID from Firebase Auth if available, otherwise backend ID
      const permanentUid = fbUid || auth.currentUser?.uid || res.user.id;
      const resolvedUser: User = { ...res.user, id: permanentUid };

      // 4. Load or merge with existing Firestore profile (do NOT overwrite with empty values)
      let resolvedFarmerProfile = res.farmerProfile;
      try {
        const cloudUser = await getUserFromFirestore(permanentUid);
        if (cloudUser) {
          // Merge preserving non-empty existing data
          Object.entries(cloudUser).forEach(([k, v]) => {
            if (v !== undefined && v !== null && (resolvedUser as any)[k] === undefined) {
              (resolvedUser as any)[k] = v;
            }
          });
        } else {
          // New Firestore user registration document
          await saveUserToFirestore(resolvedUser, permanentUid);
        }

        const cloudProfile = await getFarmerProfileFromCloud(permanentUid);
        if (cloudProfile) {
          resolvedFarmerProfile = { ...(res.farmerProfile || {}), ...cloudProfile } as FarmerProfile;
        } else if (res.farmerProfile) {
          await saveFarmerProfileToCloud(permanentUid, res.farmerProfile);
        }
      } catch (cloudErr) {
        console.warn('Cloud sync on login deferred:', cloudErr);
      }

      setUser(resolvedUser);
      setFarmerProfile(resolvedFarmerProfile);
      setStoredToken(res.token);
      await fetchUnread();
      return resolvedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    email = 'sushantshinde5598@gmail.com',
    name = 'Sushant Shinde',
    role: UserRole = 'FARMER',
    mobile?: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const fbUser = await authenticateWithFirebaseGooglePopup();
      const resolvedEmail = fbUser?.email || email;
      const resolvedName = fbUser?.displayName || name;
      const resolvedUid = fbUser?.uid || auth.currentUser?.uid;

      const res = await api.login({
        email: resolvedEmail,
        role,
        mobile,
        isGoogleAuth: true,
        googleProfile: { email: resolvedEmail, name: resolvedName }
      });

      const permanentUid = resolvedUid || res.user.id;
      const resolvedUser: User = { ...res.user, id: permanentUid };

      let resolvedFarmerProfile = res.farmerProfile;
      try {
        const cloudUser = await getUserFromFirestore(permanentUid);
        if (cloudUser) {
          Object.entries(cloudUser).forEach(([k, v]) => {
            if (v !== undefined && v !== null && (resolvedUser as any)[k] === undefined) {
              (resolvedUser as any)[k] = v;
            }
          });
        } else {
          await saveUserToFirestore(resolvedUser, permanentUid);
        }

        const cloudProfile = await getFarmerProfileFromCloud(permanentUid);
        if (cloudProfile) {
          resolvedFarmerProfile = { ...(res.farmerProfile || {}), ...cloudProfile } as FarmerProfile;
        } else if (res.farmerProfile) {
          await saveFarmerProfileToCloud(permanentUid, res.farmerProfile);
        }
      } catch (cloudErr) {
        console.warn('Google sign-in Firestore sync deferred:', cloudErr);
      }

      setUser(resolvedUser);
      setFarmerProfile(resolvedFarmerProfile);
      setStoredToken(res.token);
      await fetchUnread();
      return resolvedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      let fbUid: string | undefined;
      if (data.email) {
        const fbRes = await ensureFirebaseAuthWithEmail(data.email, undefined, data.fullName);
        if (fbRes?.uid) fbUid = fbRes.uid;
      }

      const res = await api.register(data);
      const permanentUid = fbUid || auth.currentUser?.uid || res.user.id;
      const registeredUser: User = { ...res.user, id: permanentUid };

      // Create initial Firestore user profile and farmer profile
      try {
        await saveUserToFirestore(registeredUser, permanentUid);
        if (res.farmerProfile) {
          await saveFarmerProfileToCloud(permanentUid, res.farmerProfile);
        }
      } catch (err) {
        console.warn('Registration Firestore persistence deferred:', err);
      }

      setUser(registeredUser);
      setFarmerProfile(res.farmerProfile);
      setStoredToken(res.token);
      await fetchUnread();
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.login({ role: targetRole });
      const permanentUid = auth.currentUser?.uid || res.user.id;
      const switchedUser: User = { ...res.user, id: permanentUid };

      setUser(switchedUser);
      setFarmerProfile(res.farmerProfile);
      setStoredToken(res.token);
      await fetchUnread();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    signOut(auth).catch(() => {});
    setUser(null);
    setFarmerProfile(null);
  };

  const updateFarmerProfile = async (profileData: Partial<FarmerProfile>) => {
    if (!user) return;
    const res = await api.updateProfile({ farmerProfile: profileData });
    const updatedUser = { ...user, ...res.user };
    const updatedProfile = { ...(farmerProfile || {}), ...(res.farmerProfile || profileData) } as FarmerProfile;

    // Immediately persist to Firestore
    try {
      await saveFarmerProfileToCloud(user.id, updatedProfile);
    } catch (e) {
      console.warn('Firestore farmer profile update deferred:', e);
    }

    setUser(updatedUser);
    setFarmerProfile(updatedProfile);
  };

  const updateUserProfile = async (profileData: Partial<User>) => {
    if (!user) return;
    const res = await api.updateProfile(profileData);
    const updatedUser = { ...user, ...res.user, ...profileData };

    // Immediately persist to Firestore
    try {
      await saveUserToFirestore(updatedUser, user.id);
    } catch (e) {
      console.warn('Firestore user profile update deferred:', e);
    }

    setUser(updatedUser);
    if (res.farmerProfile) {
      setFarmerProfile(res.farmerProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        farmerProfile,
        role: user?.role || 'FARMER',
        isLoading,
        unreadCount,
        refreshUnread: fetchUnread,
        login,
        loginWithGoogle,
        register,
        switchRole,
        logout,
        updateFarmerProfile,
        updateUserProfile,
        refreshAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
