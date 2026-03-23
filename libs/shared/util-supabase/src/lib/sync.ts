import { getSupabaseClient } from './supabase-client';
import type { GeoLocation } from '@emergency-response/shared/data-models';

/**
 * Upserts a vehicle's location and status in the Supabase vehicles table.
 * Uses PostGIS POINT(lng lat) format for the geography column.
 */
export async function syncVehicleToSupabase(
  unitId: string,
  location: GeoLocation,
  status: string,
  type: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('vehicles').upsert(
    {
      id: unitId,
      type,
      status,
      location: `POINT(${location.lng} ${location.lat})`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error(
      `[syncVehicleToSupabase] Error syncing ${unitId}:`,
      error.message
    );
    return false;
  }
  return true;
}
