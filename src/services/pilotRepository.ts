import { AppState, User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

export interface CloudProfile {
  id: string;
  display_name: string;
  phone: string | null;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  agency_id?: string | null;
  supervisor_id?: string | null;
}

export function emptyPilotState(): AppState {
  return {
    version: 5,
    users: [],
    stores: [],
    activities: [],
    uploads: [],
    sales: [],
    targets: [],
    targetRequests: [],
    targetProposals: [],
    scoreEvents: [],
    challenges: [],
    products: [],
    subCategories: [],
    planograms: [],
    audit: [],
    settings: {
      currentPhase: 'phase1_visitors',
      weights: {
        coverage: 15,
        assortment: 15,
        drop: 15,
        stock: 10,
        repeat: 15,
        visibility: 10,
        reliability: 10,
        growth: 10,
      },
    },
  };
}

export function mapProfileToUser(profile: CloudProfile): User {
  const parts = (profile.display_name || 'کاربر').trim().split(/\s+/);
  return {
    id: profile.id,
    phone: profile.phone || '',
    firstName: parts[0] || 'کاربر',
    lastName: parts.slice(1).join(' '),
    city: '',
    agency: 'دفتر مرکزی',
    role: profile.role,
    status: profile.status,
    supervisorId: profile.supervisor_id || undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function loadCloudProfile(userId: string): Promise<CloudProfile> {
  if (!supabase) throw new Error('تنظیمات اتصال پایگاه داده کامل نیست.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,phone,role,status,agency_id,supervisor_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!data || data.status !== 'approved') {
    throw new Error('حساب شما هنوز توسط مدیر تأیید نشده است.');
  }
  return data as CloudProfile;
}

export async function loadCloudState(profile: CloudProfile): Promise<AppState> {
  if (!supabase) throw new Error('تنظیمات اتصال پایگاه داده کامل نیست.');
  if (profile.role !== 'admin') {
    const state = emptyPilotState();
    state.users = [mapProfileToUser(profile)];
    return state;
  }
  const { data, error } = await supabase.from('app_state').select('state_json').eq('id', 'global').maybeSingle();
  if (error) throw error;
  let state: AppState;
  if (data?.state_json && typeof data.state_json === 'object') {
    state = data.state_json as AppState;
  } else {
    state = emptyPilotState();
  }
  const adminUser = mapProfileToUser(profile);
  // Admin user management must reflect real Supabase profiles, including pending signups.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,display_name,phone,role,status,agency_id,supervisor_id')
    .order('created_at', { ascending: false });
  if (profilesError) throw profilesError;
  const cloudUsers = ((profiles || []) as CloudProfile[]).map(mapProfileToUser);
  const cloudIds = new Set(cloudUsers.map(user => user.id));
  state.users = [
    ...cloudUsers,
    ...(state.users || []).filter(user => !cloudIds.has(user.id) && user.role !== 'admin'),
  ];
  if (!cloudIds.has(adminUser.id)) state.users.unshift(adminUser);
  if (!state.version || state.version < 5) state.version = 5;
  if (!data) {
    const { error: insertError } = await supabase.from('app_state').insert({
      id: 'global',
      state_json: state,
      version: 1,
      updated_by: profile.id,
    });
    if (insertError && insertError.code !== '23505') throw insertError;
  }
  return state;
}

let writeQueue: Promise<unknown> = Promise.resolve();
export function persistCloudState(state: AppState, userId: string): Promise<void> {
  if (!supabase) return Promise.reject(new Error('تنظیمات اتصال پایگاه داده کامل نیست.'));
  // Serialize writes in this browser to avoid overlapping full-document saves.
  const safeState: AppState = {
    ...state,
    users: (state.users || []).map(user => {
      const { password: _password, nationalId: _nationalId, ...safeUser } = user;
      return safeUser as User;
    }),
  };
  writeQueue = writeQueue.then(async () => {
    const { error } = await supabase!
      .from('app_state')
      .upsert({
        id: 'global',
        state_json: safeState,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (error) throw error;
  });
  return writeQueue.then(() => undefined);
}
