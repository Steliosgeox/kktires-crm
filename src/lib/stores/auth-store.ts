import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentOrgRole: 'owner' | 'admin' | 'member' | null;
  setCurrentOrg: (orgId: string, orgName: string, role: 'owner' | 'admin' | 'member') => void;
  clearCurrentOrg: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentOrgId: null,
      currentOrgName: null,
      currentOrgRole: null,
      setCurrentOrg: (orgId, orgName, role) =>
        set({ currentOrgId: orgId, currentOrgName: orgName, currentOrgRole: role }),
      clearCurrentOrg: () =>
        set({ currentOrgId: null, currentOrgName: null, currentOrgRole: null }),
    }),
    {
      name: 'kktires-auth',
    }
  )
);

