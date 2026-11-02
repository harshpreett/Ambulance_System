import { useEffect, useState } from 'react';

export function usePolling(loader, intervalMs = 10000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await loader();
        if (active) { setData(result); setError(''); }
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.error?.message || 'Unable to load the latest data.');
      } finally { if (active) setLoading(false); }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => { active = false; clearInterval(timer); };
  }, [loader, intervalMs, refreshIndex]);

  return { data, loading, error, refresh: () => setRefreshIndex((index) => index + 1), setData };
}
