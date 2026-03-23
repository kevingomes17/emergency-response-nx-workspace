import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ServiceZone } from '@emergency-response/shared/data-models';
import { SUPABASE_CONFIG } from './supabase-config';

@Injectable({ providedIn: 'root' })
export class ServiceZoneService {
  private readonly supabase: SupabaseClient;
  private readonly zonesSubject = new BehaviorSubject<ServiceZone[]>([]);

  readonly zones$: Observable<ServiceZone[]> = this.zonesSubject.asObservable();

  constructor() {
    const config = inject(SUPABASE_CONFIG);
    this.supabase = createClient(config.url, config.anonKey);
    this.refresh();
  }

  async refresh(): Promise<void> {
    const { data, error } = await this.supabase
      .from('service_zones_view')
      .select('id, name, city, priority_score, boundary, created_at, updated_at')
      .order('city')
      .order('name');

    if (error) {
      console.error('[ServiceZoneService] Failed to fetch zones:', error.message);
      return;
    }

    this.zonesSubject.next((data ?? []) as ServiceZone[]);
  }

  async addZone(data: {
    name: string;
    city: string;
    priority_score: number;
    sw_lat: number;
    sw_lng: number;
    ne_lat: number;
    ne_lng: number;
  }): Promise<void> {
    const wkt =
      `SRID=4326;MULTIPOLYGON(((` +
      `${data.sw_lng} ${data.sw_lat}, ` +
      `${data.sw_lng} ${data.ne_lat}, ` +
      `${data.ne_lng} ${data.ne_lat}, ` +
      `${data.ne_lng} ${data.sw_lat}, ` +
      `${data.sw_lng} ${data.sw_lat}` +
      `)))`;

    const { error } = await this.supabase.from('service_zones').insert({
      name: data.name,
      city: data.city,
      priority_score: data.priority_score,
      boundary: wkt,
    });

    if (error) {
      console.error('[ServiceZoneService] Failed to add zone:', error.message);
      throw error;
    }

    await this.refresh();
  }

  async updateZonePriority(id: string, priority_score: number): Promise<void> {
    const { error } = await this.supabase
      .from('service_zones')
      .update({ priority_score, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ServiceZoneService] Failed to update zone:', error.message);
      throw error;
    }

    await this.refresh();
  }

  async deleteZone(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('service_zones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ServiceZoneService] Failed to delete zone:', error.message);
      throw error;
    }

    await this.refresh();
  }
}
