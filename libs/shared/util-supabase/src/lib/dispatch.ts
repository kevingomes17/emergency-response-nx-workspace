import { getSupabaseClient } from './supabase-client';

export interface DispatchCandidate {
  vehicle_id: string;
  distance_meters: number;
  weighted_cost: number;
}

/**
 * Calls the Supabase calculate_dispatch RPC function to find the nearest
 * available vehicles, ranked by weighted cost (distance + boundary penalty).
 */
export async function calculateDispatch(
  incidentLat: number,
  incidentLng: number,
  resourceType: string,
  penaltyMeters: number = 5000
): Promise<DispatchCandidate[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('calculate_dispatch', {
    inc_lat: incidentLat,
    inc_lng: incidentLng,
    resource_type: resourceType,
    penalty_meters: penaltyMeters,
  });

  if (error) {
    throw new Error(`calculate_dispatch RPC failed: ${error.message}`);
  }

  return (data ?? []) as DispatchCandidate[];
}
