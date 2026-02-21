// Extended database types for Salvo

export type Profile = {
  id: string;
  display_name: string | null;
  party_id: string | null;
  warrior_band_id: string | null;
  role: 'general' | 'captain' | 'warrior';
  rank_id: string | null;
  level: number;
  xp: number;
  oath_signed_at: string | null;
  contract_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Directive = {
  id: string;
  party_id: string;
  author_id: string;
  title: string;
  body: string | null;
  target_goal: number;
  mission_type: 'EARLY_RAID' | 'ELECTION_DAY_SIEGE' | null;
  mission_deadline: string | null;
  requires_gps: boolean;
  created_at: string;
};

export type DirectiveBand = {
  id: string;
  directive_id: string;
  warrior_band_id: string;
  created_at: string;
};

export type Salvo = {
  id: string;
  user_id: string;
  directive_id: string;
  created_at: string;
};

export type DirectiveWithProgress = {
  id: string;
  party_id: string;
  author_id: string;
  title: string;
  body: string | null;
  target_goal: number;
  mission_type: 'EARLY_RAID' | 'ELECTION_DAY_SIEGE' | null;
  mission_deadline: string | null;
  requires_gps: boolean;
  current_salvos: number;
  created_at: string;
  is_completed: boolean;
  is_party_wide: boolean;
};

export type Party = {
  id: string;
  name: string;
  created_at: string;
};

export type WarriorBand = {
  id: string;
  party_id: string;
  name: string;
  captain_id: string | null;
  created_at: string;
};
