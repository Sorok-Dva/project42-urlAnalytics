declare module 'geojson' {
  export interface GeoJsonObject {
    type: string
  }

  export interface Feature<P = Record<string, unknown>, G = GeoJsonObject | null> extends GeoJsonObject {
    type: 'Feature'
    properties?: P | null
    geometry: G
  }

  export interface FeatureCollection<F extends Feature = Feature> extends GeoJsonObject {
    type: 'FeatureCollection'
    features: F[]
  }
}

declare module 'topojson-specification' {
  export interface Topology<Objects = Record<string, unknown>> {
    type: 'Topology'
    objects: Objects
    arcs: unknown
    transform?: unknown
  }
}

declare module 'topojson-client' {
  export function feature(topology: unknown, object: unknown): unknown
}
