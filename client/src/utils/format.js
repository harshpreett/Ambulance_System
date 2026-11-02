export const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const formatDistance = (value) => value == null ? '—' : `${Number(value).toFixed(1)} km`;
export const titleCase = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
export const mapsLink = (latitude, longitude) => `https://www.openstreetmap.org/directions?to=${encodeURIComponent(`${latitude},${longitude}`)}`;

export function dashboardPath(role) {
  if (role === 'OPERATOR') return '/operator';
  if (role === 'HOSPITAL') return '/hospital';
  return '/admin';
}
