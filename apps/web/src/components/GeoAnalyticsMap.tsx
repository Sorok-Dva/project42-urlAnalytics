
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Feature, FeatureCollection } from 'geojson'
import type { Topology } from 'topojson-specification'
import { feature } from 'topojson-client'
import L, { type Circle, type Layer, type PathOptions } from 'leaflet'
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
  const hue = 210 - clamped * 1.8
  const saturation = 75
  const lightness = 25 + clamped * 0.3
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const CITY_GRADIENT_STEPS = [
  { scale: 1, opacity: 0.28 },
  { scale: 0.6, opacity: 0.45 },
  { scale: 0.3, opacity: 0.7 }
] as const

const MIN_MAP_ZOOM = 2
const MAX_MAP_ZOOM = 10
const MIN_CITY_RADIUS_METERS = 3_000 // 3 km at max zoom per product feedback
const MAX_CITY_RADIUS_METERS = 75_000 // 75 km when fully zoomed out

const ZOOM_RADIUS_STOPS: Array<{ zoom: number; radius: number }> = [
  { zoom: MIN_MAP_ZOOM, radius: MAX_CITY_RADIUS_METERS },
  { zoom: 4, radius: 55_000 },
  { zoom: 5, radius: 50_000 },
  { zoom: 6.5, radius: 18_000 },
  { zoom: 8, radius: 8_000 },
  { zoom: MAX_MAP_ZOOM, radius: MIN_CITY_RADIUS_METERS }
]

const getBaseRadiusForZoom = (zoom: number) => {
  if (zoom <= ZOOM_RADIUS_STOPS[0].zoom) return ZOOM_RADIUS_STOPS[0].radius
  const last = ZOOM_RADIUS_STOPS[ZOOM_RADIUS_STOPS.length - 1]
  if (zoom >= last.zoom) return last.radius

  for (let index = 0; index < ZOOM_RADIUS_STOPS.length - 1; index += 1) {
    const current = ZOOM_RADIUS_STOPS[index]
    const next = ZOOM_RADIUS_STOPS[index + 1]
    if (zoom <= next.zoom) {
      const range = next.zoom - current.zoom
      const progress = range === 0 ? 0 : (zoom - current.zoom) / range
      return current.radius + progress * (next.radius - current.radius)
    }
  }

  return last.radius
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null)
  const cityLayerRef = useRef<L.LayerGroup | null>(null)
  const infoControlRef = useRef<L.Control | null>(null)
  const infoDivRef = useRef<HTMLDivElement | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(MIN_MAP_ZOOM)

  const countryMetrics = useMemo(() => {
    const map = new Map<string, AnalyticsGeoCountry>()
    countries.forEach(country => {
      if (country.code) map.set(country.code.toUpperCase(), country)
      map.set(country.label.toLowerCase(), country)
    })
    return map
  }, [countries])

  const legendGradient = useMemo(() => {
    const stops = [0, 25, 50, 75, 100]
    return stops.map(stop => `${heatColor(stop)} ${stop}%`).join(', ')
  }, [])

  const numberFormatter = useMemo(() => new Intl.NumberFormat('fr-FR'), [])

  const formatNumber = useCallback((value: number) => numberFormatter.format(value), [numberFormatter])

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

  const maxCityTotal = useMemo(() => Math.max(...cities.map(city => city.total), 1), [cities])

  const getDefaultInfoContent = useCallback(
    () =>
      [
        '<div class="font-semibold text-slate-100">Interactions globales</div>',
        `<div class="mt-1 text-xs text-slate-300">${formatNumber(totalEvents)} évènements suivi${totalEvents > 1 ? 's' : ''}</div>`,
        '<div class="mt-2 text-[11px] text-slate-400">Survolez un pays ou une ville pour obtenir le détail.</div>'
      ].join(''),
    [formatNumber, totalEvents]
  )

  const setInfoContent = useCallback((content: string) => {
    if (infoDivRef.current) {
      infoDivRef.current.innerHTML = content
    }
  }, [])

  const buildCountryInfo = useCallback(
    (country: AnalyticsGeoCountry) =>
      [
        `<div class="font-semibold text-slate-900">${country.label}</div>`,
        `<div class="mt-1 text-xs text-slate-700">${formatNumber(country.total)} interactions</div>`,
        `<div class="text-[11px] text-slate-500">${country.percentage.toFixed(1)}% des hits localisés</div>`
      ].join(''),
    [formatNumber]
  )

  const buildCityInfo = useCallback(
    (city: AnalyticsGeoCity) =>
      [
        `<div class="font-semibold text-slate-900">${city.label}</div>`,
        city.country ? `<div class="text-xs text-slate-600">${city.country}</div>` : '',
        `<div class="mt-1 text-xs text-slate-700">${formatNumber(city.total)} interactions</div>`,
        `<div class="text-[11px] text-slate-500">${city.percentage.toFixed(1)}% des hits localisés</div>`
      ]
        .filter(Boolean)
        .join(''),
    [formatNumber]
  )

  const createGeoJsonLayer = useCallback(
    (): L.GeoJSON =>
      L.geoJSON(worldFeatures as FeatureCollection, {
        pane: 'country-heat',
        style: feature => {
          const country = getCountryForFeature(feature as Feature)
          const percentage = country?.percentage ?? 0
          return {
            weight: 0.5,
            color: '#0f172a',
            fillOpacity: country ? Math.min(0.9, 0.35 + percentage / 120) : 0.1,
            fillColor: country ? heatColor(percentage) : '#1e293b'
          } satisfies PathOptions
        },
        onEachFeature: (feature: Feature, layer: Layer) => {
          const country = getCountryForFeature(feature)
          if (country) {
            layer.bindTooltip(
              `${country.label} – ${country.total.toLocaleString('fr-FR')} (${country.percentage.toFixed(1)}%)`,
              { sticky: true, direction: 'auto', className: 'geo-analytics-tooltip' }
            )
            layer.on('mouseover', () => {
              setInfoContent(buildCountryInfo(country))
              ;(layer as L.Path).setStyle({ weight: 1.4, color: '#38bdf8' })
            })
            layer.on('mouseout', () => {
              geoJsonLayerRef.current?.resetStyle(layer as L.Path)
              setInfoContent(getDefaultInfoContent())
            })
          }
        }
      }),
    [buildCountryInfo, getCountryForFeature, getDefaultInfoContent, setInfoContent]
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2.5,
      minZoom: MIN_MAP_ZOOM,
      maxZoom: MAX_MAP_ZOOM,
      zoomControl: false
    })

    setCurrentZoom(map.getZoom())

    map.createPane('country-heat').style.zIndex = '200'
    map.createPane('city-heat').style.zIndex = '300'

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)

    const geoLayer = createGeoJsonLayer()
    geoLayer.addTo(map)
    geoJsonLayerRef.current = geoLayer

    const cityLayer = L.layerGroup([], { pane: 'city-heat' }).addTo(map)
    cityLayerRef.current = cityLayer

    const infoControl = new L.Control({ position: 'topright' })
    infoControl.onAdd = () => {
      const div = L.DomUtil.create(
        'div',
        'geo-analytics-info pointer-events-none rounded-xl border border-slate-700/70 bg-slate-900/80 p-3 text-xs leading-relaxed text-slate-200 shadow-lg backdrop-blur'
      )
      div.innerHTML = getDefaultInfoContent()
      infoDivRef.current = div
      return div
    }
    infoControl.addTo(map)
    infoControlRef.current = infoControl

    const handleZoom = () => {
      setCurrentZoom(map.getZoom())
    }

    map.on('zoomend', handleZoom)

    mapRef.current = map

    return () => {
      map.off('zoomend', handleZoom)
      infoControlRef.current?.remove()
      infoControlRef.current = null
      map.off()
      map.remove()
      mapRef.current = null
      geoJsonLayerRef.current = null
      cityLayerRef.current = null
    }
  }, [createGeoJsonLayer])

  useEffect(() => {
    if (!mapRef.current) return

    geoJsonLayerRef.current?.remove()
    const newLayer = createGeoJsonLayer()
    newLayer.addTo(mapRef.current)
    geoJsonLayerRef.current = newLayer
  }, [createGeoJsonLayer, countries])

  useEffect(() => {
    if (!mapRef.current || !cityLayerRef.current) return

    const layer = cityLayerRef.current
    layer.clearLayers()

    const tooltipContent = (city: AnalyticsGeoCity) => {
      return [
        `<div class="font-medium text-slate-900">${city.label}</div>`,
        `<div class="text-slate-700">${city.total.toLocaleString('fr-FR')} hits (${city.percentage.toFixed(1)}%)</div>`,
        city.country ? `<div class="text-slate-600">${city.country}</div>` : ''
      ]
        .filter(Boolean)
        .join('')
    }

    const clampedZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, currentZoom))
    const baseRadius = getBaseRadiusForZoom(clampedZoom)

    cities
      .filter(city => typeof city.latitude === 'number' && typeof city.longitude === 'number')
      .forEach(city => {
        const baseColor = heatColor(city.percentage)
        const normalized = Math.max(city.total / maxCityTotal, 0.05)
        const radiusScale = Math.max(0.4, Math.sqrt(normalized))
        const circles: Circle[] = []

        CITY_GRADIENT_STEPS.forEach((step, index) => {
          const circle = L.circle([city.latitude as number, city.longitude as number], {
            pane: 'city-heat',
            radius: step.scale * baseRadius * radiusScale,
            color: 'transparent',
            fillColor: baseColor,
            fillOpacity: Math.min(0.92, step.opacity * (0.6 + normalized * 0.6)),
            weight: 0,
            bubblingMouseEvents: false
          })

          circle.addTo(layer)
          circles.push(circle)
          circle.on('mouseover', () => {
            setInfoContent(buildCityInfo(city))
          })
          circle.on('mouseout', () => {
            setInfoContent(getDefaultInfoContent())
          })
          if (index === CITY_GRADIENT_STEPS.length - 1) {
            circle.bindTooltip(tooltipContent(city), {
              direction: 'top',
              offset: L.point(0, -8),
              opacity: 0.95,
              className: 'geo-analytics-tooltip'
            })
          }
        })
      })
  }, [buildCityInfo, cities, currentZoom, getDefaultInfoContent, maxCityTotal, setInfoContent])

  useEffect(() => {
    setInfoContent(getDefaultInfoContent())
  }, [getDefaultInfoContent, setInfoContent])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40">
      <div ref={containerRef} className="h-[420px] w-full" />
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
