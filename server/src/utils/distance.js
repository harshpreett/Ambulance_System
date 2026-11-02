const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(Number(a.latitude));
  const lat2 = radians(Number(b.latitude));
  const dLat = lat2 - lat1;
  const dLon = radians(Number(b.longitude) - Number(a.longitude));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateEtaMinutes(distanceKm) {
  // A fixed 30 km/h is used only to make a consistent demo estimate, not live traffic routing.
  return Math.max(1, Math.round((distanceKm / 30) * 60));
}
