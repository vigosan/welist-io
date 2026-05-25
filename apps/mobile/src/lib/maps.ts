type Coords = {
  latitude: string;
  longitude: string;
  placeName: string;
};

export function mapsUrl(
  coords: Coords,
  platform: "ios" | "android"
): string {
  const { latitude, longitude, placeName } = coords;
  if (platform === "ios") {
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(placeName)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`
  )}`;
}
