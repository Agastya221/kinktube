"use client";

import { useState, useEffect, useCallback } from "react";
import type { Video, VideoListResponse, VideoQueryParams } from "@/lib/types";
import { getVideos } from "@/lib/api";

interface UseVideosResult {
  videos: Video[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVideos(params: VideoQueryParams = {}): UseVideosResult {
  const [data, setData] = useState<VideoListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getVideos(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, [params.page, params.per_page, params.sort, params.category, params.q]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    videos: data?.videos || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.total_pages || 1,
    loading,
    error,
    refetch: fetchVideos,
  };
}
