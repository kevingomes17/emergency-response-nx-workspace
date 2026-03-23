import {
  Component,
  input,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type {
  Incident,
  IncidentType,
  Resource,
  ResourceStatus,
  ResourceType,
  Severity,
  ServiceZone,
} from '@emergency-response/shared/data-models';

// ── Color maps ──

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c',
};

const RESOURCE_STATUS_COLORS: Record<ResourceStatus, string> = {
  available: '#22c55e',
  dispatched: '#f97316',
  en_route: '#3b82f6',
  on_scene: '#a855f7',
  offline: '#737373',
};

const TYPE_LABELS: Record<IncidentType, string> = {
  fire: 'Fire',
  medical: 'Medical',
  security: 'Security',
  water_leakage: 'Water Leak',
  power_failure: 'Power Failure',
};

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  fire_truck: 'Fire Truck',
  ambulance: 'Ambulance',
  police: 'Police',
  maintenance: 'Maintenance',
  electrician: 'Electrician',
};

const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  fire_truck: '\u{1F692}',
  ambulance: '\u{1F691}',
  police: '\u{1F693}',
  maintenance: '\u{1F527}',
  electrician: '\u{26A1}',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

// ── Boundary Parser (GeoJSON or WKT) ──

function parseGeoJson(geo: { type?: string; coordinates?: number[][][][] }): L.LatLngExpression[][][] {
  if (geo.type === 'MultiPolygon' && geo.coordinates) {
    return geo.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression)
      )
    );
  }
  return [];
}

function parseBoundary(boundary: unknown): L.LatLngExpression[][][] {
  if (!boundary) return [];

  // Handle GeoJSON object
  if (typeof boundary === 'object') {
    return parseGeoJson(boundary as { type?: string; coordinates?: number[][][][] });
  }

  // Handle string: could be GeoJSON string or WKT
  if (typeof boundary === 'string') {
    // Try parsing as GeoJSON string first
    if (boundary.trim().startsWith('{')) {
      try {
        const geo = JSON.parse(boundary);
        return parseGeoJson(geo);
      } catch {
        // fall through to WKT
      }
    }

    // WKT fallback
    const cleaned = boundary.replace(/^SRID=\d+;/i, '').trim();
    const match = cleaned.match(/MULTIPOLYGON\s*\(\(\((.+)\)\)\)/i);
    if (!match) return [];

    const polygonStrings = match[1].split(')),((');
    return polygonStrings.map((polyStr) => {
      const rings = polyStr.split('),(');
      return rings.map((ring) =>
        ring
          .replace(/[()]/g, '')
          .split(',')
          .map((coord) => {
            const [lng, lat] = coord.trim().split(/\s+/).map(Number);
            return [lat, lng] as L.LatLngExpression;
          })
      );
    });
  }

  return [];
}

@Component({
  selector: 'er-dashboard-map',
  standalone: true,
  template: `<div #mapContainer class="map-container"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .map-container {
      width: 100%;
      height: 65vh;
      border-radius: 10px;
      border: 1px solid #2e2e3e;
      overflow: hidden;
    }
  `,
})
export class DashboardMap implements AfterViewInit, OnChanges, OnDestroy {
  readonly incidents = input<Incident[]>([]);
  readonly resources = input<Resource[]>([]);
  readonly serviceZones = input<ServiceZone[]>([]);
  readonly showIncidents = input<boolean>(true);
  readonly showResources = input<boolean>(true);
  readonly showZones = input<boolean>(true);

  private readonly mapEl = viewChild.required<ElementRef>('mapContainer');

  private map: L.Map | null = null;
  private incidentLayer = L.layerGroup();
  private resourceLayer = L.layerGroup();
  private zoneLayer = L.layerGroup();

  ngAfterViewInit(): void {
    this.initMap();
    this.renderAll();
  }

  ngOnChanges(): void {
    if (this.map) {
      this.renderAll();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private initMap(): void {
    const el = this.mapEl().nativeElement;

    this.map = L.map(el, {
      center: [18.52, 73.85], // Pune default
      zoom: 11,
      zoomControl: true,
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(this.map);

    // Add layers to map
    this.zoneLayer.addTo(this.map);
    this.incidentLayer.addTo(this.map);
    this.resourceLayer.addTo(this.map);
  }

  private renderAll(): void {
    if (this.showZones()) {
      this.renderZones();
    } else {
      this.zoneLayer.clearLayers();
    }

    if (this.showIncidents()) {
      this.renderIncidents();
    } else {
      this.incidentLayer.clearLayers();
    }

    if (this.showResources()) {
      this.renderResources();
    } else {
      this.resourceLayer.clearLayers();
    }

    this.fitBounds();
  }

  private renderIncidents(): void {
    this.incidentLayer.clearLayers();

    for (const inc of this.incidents()) {
      const color = SEVERITY_COLORS[inc.severity] ?? '#888';

      const marker = L.circleMarker([inc.location.lat, inc.location.lng], {
        radius: 9,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      });

      marker.bindPopup(
        `<div style="font-size:13px;line-height:1.5">
          <strong>${TYPE_LABELS[inc.type] ?? inc.type}</strong><br/>
          Severity: <span style="color:${color};font-weight:600">${inc.severity.toUpperCase()}</span><br/>
          Status: ${inc.status.replace('_', ' ')}<br/>
          ${inc.description ? `<em>${inc.description}</em>` : ''}
        </div>`
      );

      marker.addTo(this.incidentLayer);
    }
  }

  private renderResources(): void {
    this.resourceLayer.clearLayers();

    for (const res of this.resources()) {
      const color = RESOURCE_STATUS_COLORS[res.status] ?? '#888';

      const typeEmoji = RESOURCE_TYPE_ICONS[res.type] ?? '\u{1F698}';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:34px;height:34px;border-radius:8px;
          background:#1e1e2e;border:2px solid ${color};
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          box-shadow:0 2px 6px rgba(0,0,0,0.5);
          position:relative;
        ">${typeEmoji}<span style="
          position:absolute;bottom:-2px;right:-2px;
          width:10px;height:10px;border-radius:50%;
          background:${color};border:1.5px solid #1e1e2e;
        "></span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([res.location.lat, res.location.lng], { icon });

      marker.bindPopup(
        `<div style="font-size:13px;line-height:1.5">
          <strong>${res.unit_id}</strong><br/>
          Type: ${RESOURCE_TYPE_LABELS[res.type] ?? res.type}<br/>
          Status: <span style="color:${color};font-weight:600">${res.status.replace('_', ' ')}</span><br/>
          ${res.assigned_incident ? `Incident: ${res.assigned_incident}` : ''}
        </div>`
      );

      marker.addTo(this.resourceLayer);
    }
  }

  private renderZones(): void {
    this.zoneLayer.clearLayers();
    const zones = this.serviceZones();
    console.log('[DashboardMap] renderZones called, zone count:', zones.length);

    for (const zone of zones) {
      console.log('[DashboardMap] zone:', zone.name, 'boundary type:', typeof zone.boundary, 'boundary:', zone.boundary);
      const coords = parseBoundary(zone.boundary);
      console.log('[DashboardMap] parsed coords:', coords.length);
      if (coords.length === 0) continue;

      const color = PRIORITY_COLORS[zone.priority_score] ?? '#6366f1';

      for (const polygon of coords) {
        const poly = L.polygon(polygon, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.12,
          dashArray: '6 4',
        });

        poly.bindPopup(
          `<div style="font-size:13px;line-height:1.5">
            <strong>${zone.name}</strong><br/>
            City: ${zone.city}<br/>
            Priority: ${zone.priority_score}
          </div>`
        );

        poly.addTo(this.zoneLayer);
      }
    }
  }

  private fitBounds(): void {
    if (!this.map) return;

    const allLatLngs: L.LatLng[] = [];

    if (this.showIncidents()) {
      this.incidents().forEach((i) =>
        allLatLngs.push(L.latLng(i.location.lat, i.location.lng))
      );
    }

    if (this.showResources()) {
      this.resources().forEach((r) =>
        allLatLngs.push(L.latLng(r.location.lat, r.location.lng))
      );
    }

    if (this.showZones()) {
      this.zoneLayer.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const bounds = layer.getBounds();
          allLatLngs.push(bounds.getSouthWest());
          allLatLngs.push(bounds.getNorthEast());
        }
      });
    }

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }
}
