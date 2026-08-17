'use client';

import { useState, useEffect } from 'react';

interface UseNewsOptions {
  category?: string;
  country?: string;
  sort?: 'smart' | 'date';
  interests?: string[];
  limit?: number;
}

export function useNews(options: UseNewsOptions | string = {}) {
  const category = typeof options === 'string' ? options : options.category;
  const country = typeof options === 'object' ? options.country : undefined;
  const sort = typeof options === 'object' ? options.sort || 'smart' : 'smart';
  const interests = typeof options === 'object' ? options.interests : undefined;
  const limit = typeof options === 'object' ? options.limit || 30 : 30;

  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (country && country !== 'ALL') params.set('country', country);
    if (sort) params.set('sort', sort);
    if (interests && interests.length > 0) params.set('interests', interests.join(','));
    if (limit) params.set('limit', limit.toString());

    fetch(`/api/news?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNews(data.data || []);
        } else {
          setNews([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching news:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [category, country, sort, JSON.stringify(interests), limit]);

  return { news, loading, error };
}

export function useWeather(city = 'Dhaka', country = 'BD') {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/weather?city=${city}&country=${country}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setWeather(data.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [city, country]);

  return { weather, loading };
}
