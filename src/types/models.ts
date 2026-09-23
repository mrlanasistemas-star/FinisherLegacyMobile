/**
 * Domain types mirroring the real API Resources in
 * finisherLegacy/app/Http/Resources/Api/V1/* — every field here was
 * confirmed by reading the actual Resource class, nothing invented.
 */

import type { LegacyMoment } from './social';

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
  state: string | null;
  country: string | null;
  sport: string | null;
  photo_url: string | null;
  cover_url: string | null;
}

export interface PublicAthleteStats {
  medals: number;
  events: number;
  followers: number;
  following: number;
  moments: number;
}

/** One row of the public "Carreras" list — `PublicAthleteProfileService::recentEvents()`. */
export interface PublicAthleteRace {
  event: string | null;
  event_slug: string | null;
  edition: string | null;
  event_date: string | null;
  race: string | null;
  distance: string | null;
  official_time: string | null;
  pace: string | null;
}

/** GET /athletes/{username} — `PublicAthleteController::show`. */
export interface PublicAthlete {
  profile: PublicAthleteProfile;
  stats: PublicAthleteStats;
  viewer: {
    is_own: boolean;
    is_following: boolean;
    is_blocked: boolean;
    can_follow: boolean;
  };
  medals: PublicMedal[];
  recent_moments: LegacyMoment[];
  recent_events: PublicAthleteRace[];
}

/** GET /profile (a.k.a. /me/profile) — `Api\V1\ProfileController::show`. */
export interface MyProfileResponse {
  athlete: { legacy_id: string; full_name: string };
  profile: AthleteProfile | null;
  stats: {
    event_count: number;
    total_distance_km: number | null;
    legacy_plate_count: number;
    medal_count: number;
    gear_count: number;
    media_count: number;
  };
  social: {
    followers_count: number;
    following_count: number;
    moments_count: number;
  };
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
  /** Public race id — what `POST /events/{edition}/preregister` takes as `event_race_uuid`. */
  uuid: string;
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
    id: number;
    name: string;
    preregistration_open: boolean;
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

// ---------------------------------------------------------------------------
// My Events / History — GET /me/events, /me/history, /me/events/{participant}
// Fields confirmed against App\Queries\Athletes\GetAthleteHistory::summarize
// and App\Queries\Athletes\GetEventParticipantDetail::handle.
// ---------------------------------------------------------------------------

export interface AthleteHistoryResult {
  official_time: string;
  pace: string;
  overall_position: number | null;
}

/** One row of GET /me/events|/me/history — summary only, no nested media/gear objects (server deliberately avoids loading full collections in a list). */
export interface AthleteHistoryRow {
  id: number;
  event: string | null;
  edition: string | null;
  race: string | null;
  bib_number: string | null;
  event_date: string | null;
  result: AthleteHistoryResult | null;
  legacy_plate_status: string | null;
  medal_count: number;
  gear_count: number;
  media_count: number;
}

export interface EventResultSplit {
  label: string;
  distance_value: number;
  distance_unit: string;
  segment_time: string;
  elapsed_time: string;
  pace: string;
}

export interface EventParticipantResult {
  official_time: string | null;
  chip_time: string | null;
  pace: string | null;
  overall_position: number | null;
  gender_position: number | null;
  category_position: number | null;
  splits: EventResultSplit[];
}

export interface LegacyPlateModelField {
  field_key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  alignment: string;
  visible: boolean;
}

export interface LegacyPlateModelDetail {
  name: string;
  slug: string;
  width_mm: number;
  height_mm: number;
  engraving_area: unknown;
  preview_image_url: string | null;
  fields: LegacyPlateModelField[];
}

export interface LegacyPlatePersonalization {
  athlete_name: string | null;
  race_label: string | null;
  official_time: string | null;
  pace: string | null;
}

export interface ParticipantLegacyPlate {
  status: string;
  serial_number: string | null;
  legacy_code: string | null;
  model: LegacyPlateModelDetail | null;
  personalization: LegacyPlatePersonalization;
}

export interface ParticipantPlateSummary {
  id: number;
  serial_number: string | null;
  status: string;
  legacy_code: string | null;
  engraving_display_name: string | null;
}

export interface ParticipantMedalSummary {
  id: string;
  title: string | null;
  story: string | null;
  image_url: string | null;
}

export interface ParticipantMediaSummary {
  uuid: string;
  type: 'image' | 'video';
  url: string;
  is_public: boolean;
}

export interface ParticipantGearUsed {
  uuid: string;
  athlete_owned_product_uuid: string;
  product_name: string;
  variant_name: string | null;
  asset_code: string | null;
  notes: string | null;
}

export interface ParticipantPurchase {
  id: number;
  name: string;
  quantity: number;
  line_total_minor: number;
  currency: string;
  order_uuid: string;
  payment_status: string;
}

export interface SupportMessageOwnerView {
  id: number;
  type: string;
  message_text: string | null;
  audio_url: string | null;
  contributor_name: string | null;
  status: string;
  is_surprise: boolean;
  created_at: string;
}

export interface ParticipantSupportSession {
  public_code: string;
  title: string;
  public_url: string;
  qr_url: string;
  status: string;
  messages: SupportMessageOwnerView[];
}

export interface EventParticipantSummary {
  id: number;
  event: string | null;
  edition: string | null;
  race: string | null;
  bib_number: string | null;
  event_date: string | null;
}

/** GET /me/events/{participant} — one call bundling result+splits, medals, legacy plate, media, gear, purchases and support session for that participation. */
export interface EventParticipantDetail {
  participant: EventParticipantSummary;
  result: EventParticipantResult | null;
  medals: ParticipantMedalSummary[];
  legacyPlate: ParticipantLegacyPlate | null;
  plates: ParticipantPlateSummary[];
  media: ParticipantMediaSummary[];
  gearUsed: ParticipantGearUsed[];
  purchases: ParticipantPurchase[];
  supportSession: ParticipantSupportSession | null;
}

// ---------------------------------------------------------------------------
// Event Media — GET/POST /me/events/{participant}/media, PATCH/DELETE /me/media/{uuid}
// ---------------------------------------------------------------------------

/** No `id` field on purpose — the index resource only exposes `uuid` (confirmed against AthleteEventMediaResource). Reorder persistence needs an internal id the API doesn't expose yet; see docs/MOBILE_BACKEND_REQUIREMENTS.md. */
export interface AthleteEventMedia {
  uuid: string;
  type: 'image' | 'video';
  url: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  is_public: boolean;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Event Gear (per participation) — GET/POST /me/events/{participant}/gear, DELETE .../gear/{gear}
// ---------------------------------------------------------------------------

export interface EventGearSelection {
  uuid: string;
  athlete_owned_product_uuid: string;
  product_name: string;
  variant_name: string | null;
  asset_code: string | null;
  notes: string | null;
  selected_at: string;
}

// ---------------------------------------------------------------------------
// Digital Closet — GET /me/gear, POST /gear/{code}/claim, GET /gear/{code}
// ---------------------------------------------------------------------------

export type GearStatus = 'unclaimed' | 'assigned' | 'active' | 'revoked';

export interface GearUsageHistoryEntry {
  event_participant_id: number;
  event: string | null;
  edition: string | null;
  selected_at: string;
}

/** No `image_url` field exists on this resource (confirmed) — gear cards fall back to type-based iconography, never a fabricated photo. */
export interface AthleteOwnedProduct {
  uuid: string;
  product_name: string;
  variant_name: string | null;
  status: GearStatus;
  asset_code: string;
  acquired_at: string;
  activated_at: string | null;
  /** Omitted entirely by the API when the relation wasn't eager-loaded — always default to []. */
  usage_history?: GearUsageHistoryEntry[];
}

export interface PublicGear {
  product_name: string;
  variant_name: string | null;
  status: GearStatus;
  claimable: boolean;
}

// ---------------------------------------------------------------------------
// Notifications — GET /me/notifications, POST .../read, POST .../read-all
// ---------------------------------------------------------------------------

/** Structured deep-link target — whitelisted server-side from the notification metadata. */
export interface NotificationTarget {
  kind: 'athlete' | 'moment' | 'order' | 'event';
  username?: string;
  moment_uuid?: string;
  order_uuid?: string;
}

export interface AppNotification {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  action_url: string | null;
  target: NotificationTarget | null;
  read_at: string | null;
  created_at: string;
}

/** GET /me/events/{participant}/media-entitlement — the only source of media limits. */
export interface MediaEntitlementBucket {
  used: number;
  limit: number;
  remaining: number;
  max_bytes: number;
  allowed_mimes: string[];
}

export interface MediaEntitlement {
  images: MediaEntitlementBucket;
  videos: MediaEntitlementBucket;
  memory_packs_enabled: boolean;
}

// ---------------------------------------------------------------------------
// Push devices — POST/DELETE /me/push-devices
// ---------------------------------------------------------------------------

export interface PushDevice {
  uuid: string;
  platform: 'ios' | 'android' | 'web';
  provider: string;
}

// ---------------------------------------------------------------------------
// Support — /me/support-sessions*, /me/support-messages/{message}/consumed
// ---------------------------------------------------------------------------

export interface SupportSessionSummary {
  id: number;
  title: string;
  public_code: string;
  public_url: string;
  qr_url: string;
  status: string;
  target_distance_meters: number | null;
  allow_text: boolean;
  allow_audio: boolean;
  accepting: boolean;
}

export interface SupportSessionDetail extends SupportSessionSummary {
  messages: SupportMessageOwnerView[];
}

export interface SupportManifestMessage {
  id: number;
  type: string;
  trigger_type: string;
  trigger_distance_meters: number | null;
  is_surprise: boolean;
  has_audio: boolean;
  audio_mime: string | null;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  updated_at: string;
}

export interface SupportSessionManifest extends SupportSessionSummary {
  messages: SupportManifestMessage[];
}

export interface SupportTriggeredMessage {
  id: number;
  type: string;
  message_text: string | null;
  audio_url: string | null;
  contributor_name: string | null;
  is_surprise: boolean;
}

// ---------------------------------------------------------------------------
// Store — GET /store/products, /store/products/{slug}
// ---------------------------------------------------------------------------

export interface ProductSummary {
  uuid: string;
  name: string;
  slug: string;
  type: string;
  brand: string | null;
  category: string | null;
  category_slug: string | null;
  /** Any active variant available — boolean only, never a stock count. */
  in_stock: boolean;
  from_price_minor: number | null;
  currency: string;
  image_url: string | null;
}

export interface ProductCategoryOption {
  name: string;
  slug: string;
}

export interface ProductGalleryItem {
  type: 'image' | 'video';
  url: string;
  poster_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
}

export interface ProductVariant {
  uuid: string;
  sku: string;
  name: string;
  attributes: Record<string, unknown>;
  base_price_minor: number;
  currency: string;
  active: boolean;
  /** Never an exact stock count by design — boolean only. */
  in_stock: boolean;
}

export interface ProductDetail {
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  brand: string | null;
  category: string | null;
  qr_capable: boolean;
  requires_shipping: boolean;
  image_url: string | null;
  /** Omitted by the API when the `media` relation wasn't eager-loaded — default to []. */
  gallery?: ProductGalleryItem[];
  variants: ProductVariant[];
}

// ---------------------------------------------------------------------------
// Cart — GET/POST/PATCH/DELETE /cart*
// ---------------------------------------------------------------------------

export interface CartItem {
  id: number;
  quantity: number;
  product_name: string;
  product_slug: string;
  variant_name: string | null;
  unit_price_minor: number;
  line_total_minor: number;
  currency: string;
  price_type: string;
  price_available: boolean;
  in_stock: boolean;
  image_url: string | null;
  event_edition_name: string | null;
}

export interface CartCoupon {
  code: string;
  name: string;
}

/** The cart is never the source of truth for price — a UX preview only; /checkout always revalidates server-side. */
export interface Cart {
  uuid: string;
  currency: string;
  items: CartItem[];
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  coupon: CartCoupon | null;
}

// ---------------------------------------------------------------------------
// Orders — GET /orders, /orders/{uuid}, POST /checkout
// ---------------------------------------------------------------------------

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';
export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';

export interface OrderItem {
  uuid: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  currency: string;
  fulfilled: boolean;
}

/**
 * The one field payment UX renders from — derived server-side in
 * `OrderResource::paymentState()`. "Order created" (`status`) and "payment
 * paid" (`payment_state === 'paid'`) are never the same thing.
 */
export type PaymentState = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface OrderPaymentSummary {
  status: PaymentStatus;
  provider: string;
  method: string;
  paid_at: string | null;
  failed_at: string | null;
}

export interface Order {
  uuid: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_state: PaymentState;
  /** Server decides: not paid, not cancelled/completed, not expired. */
  payable: boolean;
  fulfillment_status: FulfillmentStatus;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  currency: string;
  coupon_code: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  /** When an unpaid order stops being payable (null once paid/closed). */
  expires_at: string | null;
  payment: OrderPaymentSummary | null;
  /** Omitted when the server didn't load items (e.g. right after checkout it does). */
  items?: OrderItem[];
}

// ---------------------------------------------------------------------------
// Payments — POST /orders/{uuid}/payments/online
// ---------------------------------------------------------------------------

/**
 * `POST /orders/{uuid}/payments/online` with `provider: 'stripe'` — what
 * Stripe's PaymentSheet needs. Never a secret key. Calling it again for the
 * same order returns the SAME PaymentIntent (resume), never a second charge.
 */
export interface OnlinePaymentResult {
  order_uuid: string;
  provider_reference: string;
  client_payload: {
    provider?: string;
    client_secret?: string;
    publishable_key?: string | null;
    merchant_display_name?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Legacy Plate Models — GET /legacy-plate-models (public catalog)
// ---------------------------------------------------------------------------

export interface LegacyPlateModel {
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  width_mm: number;
  height_mm: number;
  preview_image_url: string | null;
}
