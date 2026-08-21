/**
 * Domain types mirroring the real API Resources in
 * finisherLegacy/app/Http/Resources/Api/V1/* — every field here was
 * confirmed by reading the actual Resource class, nothing invented.
 */

export type Visibility = 'public' | 'private';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  legacy_id: string | null;
  athlete: { id: number; full_name: string } | null;
  permissions: string[];
  created_at: string | null;
}

export interface AthleteProfile {
  username: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  main_sport_id: number | null;
  sport: string | null;
  profile_visibility: Visibility;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
}

export interface MedalGalleryImage {
  id: number;
  url: string | null;
}

export interface Medal {
  id: string; // uuid
  title: string | null;
  event_name_manual: string | null;
  event_date: string | null; // YYYY-MM-DD
  distance_label: string | null;
  official_time: string | null;
  pace: string | null;
  city: string | null;
  country: string | null;
  story: string | null;
  visibility: Visibility;
  is_official: boolean;
  event_name: string | null;
  race_name: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  gallery_images: MedalGalleryImage[];
  created_at: string | null;
}

export interface PublicMedal {
  id: string; // uuid
  title: string | null;
  distance_label: string | null;
  event_date: string | null;
  thumbnail_url: string | null;
}

export interface PublicAthleteProfile {
  name: string;
  username: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  sport: string | null;
  photo_url: string | null;
  cover_url: string | null;
}

export interface PublicAthleteStats {
  medals: number;
  events: number;
}

export interface PublicAthlete {
  profile: PublicAthleteProfile;
  stats: PublicAthleteStats;
  medals: PublicMedal[];
}

export type LegacyCodeStatus = 'active' | 'blocked' | 'cancelled' | 'replaced' | (string & {});

export interface LegacyCodeLookup {
  code: string;
  available: boolean;
  linked: boolean;
  owned_by_me?: boolean;
  plate: {
    athlete_name: string | null;
    event_name: string | null;
    race_name: string | null;
    official_time: string | null;
    pace: string | null;
    event_date: string | null;
    status: string;
  } | null;
  athlete: {
    username: string;
    city: string | null;
    sport: string | null;
  } | null;
}

export interface LegacyCodeClaimResult {
  legacy_code: string;
  medal: Medal | null;
}

export interface EventRace {
  name: string;
  distance_value: number;
  distance_unit: string;
  start_time: string | null;
}

export interface EventEditionCard {
  id: number;
  name: string;
  year: number;
  event_date: string;
  city: string | null;
  state: string | null;
  country: string | null;
  phase: string;
  event: {
    name: string;
    slug: string;
    cover_url: string | null;
    sport: { name: string; slug: string };
  };
  distances: string[];
}

export interface EventDetail {
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  sport: string;
  organizer: string | null;
  edition: {
    name: string;
    year: number;
    event_date: string;
    city: string | null;
    state: string | null;
    country: string | null;
    phase: string;
    registration_open_at: string | null;
    registration_close_at: string | null;
    races: EventRace[];
  } | null;
}

export interface Preregistration {
  token: string;
  status: string;
  first_name?: string;
  last_name?: string;
  bib_number?: string | null;
  event?: string;
  edition?: string;
  race?: string;
}
