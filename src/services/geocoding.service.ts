export interface Place {
  name: string;
  city?: string;
  country?: string;
  latitude: string;
  longitude: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as PhotonResponse;
  return data.features.map((f) => ({
    name: f.properties.name ?? query,
    city: f.properties.city,
    country: f.properties.country,
    latitude: String(f.geometry.coordinates[1]),
    longitude: String(f.geometry.coordinates[0]),
  }));
}
