'use client';

import { useState, useEffect } from 'react';

export function useNews(category?: string) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = category 
      ? `/api/news?category=${category}&limit=20`
      : '/api/news?limit=20';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setNews(data.data);
        else setNews([]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching news:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [category]);

  return { news, loading, error };
}

export function useWeather() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        if (data.success) setWeather(data.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return { weather, loading };
}
