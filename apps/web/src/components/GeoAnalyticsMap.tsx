import { useMemo, useState, useCallback } from 'react'
import type { Feature, FeatureCollection } from 'geojson'
import type { Topology } from 'topojson-specification'
import { feature } from 'topojson-client'
import { MapContainer, TileLayer, GeoJSON, Circle, Tooltip, useMapEvents } from 'react-leaflet'
import type { Layer, StyleFunction } from 'leaflet'
import type { AnalyticsGeoCity, AnalyticsGeoCountry } from '../types'
import 'leaflet/dist/leaflet.css'
import countriesTopology from 'world-atlas/countries-110m.json'

interface GeoAnalyticsMapProps {
  countries: AnalyticsGeoCountry[]
  cities: AnalyticsGeoCity[]
  totalEvents: number
}

const countriesTopologyTyped = countriesTopology as unknown as Topology<{ countries: { type: 'GeometryCollection' } }>
const worldFeatures = feature(countriesTopologyTyped, countriesTopologyTyped.objects.countries) as FeatureCollection

const heatColor = (percentage: number) => {
  const clamped = Math.min(100, Math.max(0, percentage))
  const hue = 210 - clamped * 1.8 // from blue-ish to red
  const saturation = 70
  const lightness = 30 + clamped * 0.25
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const ZoomWatcher = ({ onChange }: { onChange: (zoom: number) => void }) => {
  useMapEvents({
    zoomend: event => onChange(event.target.getZoom())
  })
  return null
}

const resolveFeatureKey = (feature?: Feature) => {
  if (!feature) {
    return {
      iso3: undefined,
      iso2: undefined,
      name: undefined
    }
  }
  const properties = (feature.properties ?? {}) as Record<string, unknown>
  const iso3 = (properties.iso_a3 ?? properties.ISO_A3 ?? properties.ADM0_A3) as string | undefined
  const iso2 = (properties.iso_a2 ?? properties.ISO_A2 ?? properties.ADM0_A2) as string | undefined
  const name = (properties.name ?? properties.NAME ?? properties.ADMIN) as string | undefined
  return {
    iso3: iso3 ? iso3.toUpperCase() : undefined,
    iso2: iso2 ? iso2.toUpperCase() : undefined,
    name: name ? name.toLowerCase() : undefined
  }
}

export const GeoAnalyticsMap = ({ countries, cities, totalEvents }: GeoAnalyticsMapProps) => {
  const [zoom, setZoom] = useState(2.5)

  const countryMetrics = useMemo(() => {
    const map = new Map<string, AnalyticsGeoCountry>()
    countries.forEach(country => {
      if (country.code) map.set(country.code.toUpperCase(), country)
      map.set(country.label.toLowerCase(), country)
    })
    return map
  }, [countries])

  const getCountryForFeature = useCallback(
    (feature?: Feature) => {
      const { iso3, iso2, name } = resolveFeatureKey(feature)
      if (iso3) {
        const match = countryMetrics.get(iso3)
        if (match) return match
      }
      if (iso2) {
        const match = countryMetrics.get(iso2)
        if (match) return match
      }
      if (name) {
        const match = countryMetrics.get(name)
        if (match) return match
      }
      return undefined
    },
    [countryMetrics]
  )

  const style = useCallback<StyleFunction>(
    feature => {
      const country = getCountryForFeature(feature)
      const percentage = country?.percentage ?? 0
      return {
        weight: 0.5,
        color: '#0f172a',
        fillOpacity: country ? 0.75 : 0.25,
        fillColor: country ? heatColor(percentage) : '#1e293b'
      }
    },
    [getCountryForFeature]
  )

  const onEachCountry = useCallback(
    (feature: Feature, layer: Layer) => {
      const country = getCountryForFeature(feature)
      if (country) {
        layer.bindTooltip(
          `${country.label} – ${country.total.toLocaleString('fr-FR')} (${country.percentage.toFixed(1)}%)`,
          { sticky: true }
        )
      }
    },
    [getCountryForFeature]
  )

  const maxCityTotal = useMemo(() => Math.max(...cities.map(city => city.total), 1), [cities])

  const radiusForCity = (cityTotal: number, cityPercentage: number) => {
    const share = Math.max(cityPercentage / 100, cityTotal / maxCityTotal)
    const scaledShare = Math.sqrt(Math.max(0.02, share))
    const baseRadius = 15000 * scaledShare
    const zoomFactor = Math.pow(1.8, zoom - 2)
    const radius = baseRadius / zoomFactor
    return Math.max(200, Math.min(15000, radius))
  }

  const legendGradient = useMemo(() => {
    const stops = [0, 25, 50, 75, 100]
    return stops.map(stop => `${heatColor(stop)} ${stop}%`).join(', ')
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
      <MapContainer center={[20, 0]} zoom={2} minZoom={2} maxZoom={10} scrollWheelZoom className="h-[420px] w-full">
        <ZoomWatcher onChange={setZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON data={worldFeatures as FeatureCollection} style={style} onEachFeature={onEachCountry} />
        {cities
          .filter(city => typeof city.latitude === 'number' && typeof city.longitude === 'number')
          .map(city => (
            <Circle
              key={`${city.label}-${city.latitude}-${city.longitude}`}
              center={[city.latitude as number, city.longitude as number]}
              radius={radiusForCity(city.total, city.percentage)}
              pathOptions={{
                color: heatColor(city.percentage),
                fillColor: heatColor(city.percentage),
                fillOpacity: Math.min(0.9, 0.45 + city.percentage / 180),
                weight: 1
              }}
            >
              <Tooltip direction="top" offset={[0, -2]} opacity={0.95} className="text-xs">
                <div className="font-medium text-slate-100">{city.label}</div>
                <div className="text-slate-200">
                  {city.total.toLocaleString('fr-FR')} hits ({city.percentage.toFixed(1)}%)
                </div>
                {city.country && <div className="text-slate-400">{city.country}</div>}
              </Tooltip>
            </Circle>
          ))}
      </MapContainer>
      <div className="border-t border-slate-800/70 px-6 py-3">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted">Intensité relative (% de hits)</div>
          <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${legendGradient})` }} />
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/70 px-6 py-3 text-xs text-muted">
        Total évènements considérés : {totalEvents.toLocaleString('fr-FR')}
      </div>
    </div>
  )
}
