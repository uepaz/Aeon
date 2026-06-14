/**
 * React Query hooks for Gallery
 * 提供缓存和自动重新请求功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGalleryPhotos, type FetchGalleryFilters, type GalleryPhoto } from '@/app/(dashboard)/gallery/actions';

/**
 * 获取画廊照片列表
 */
export function useGalleryPhotos(filters: FetchGalleryFilters) {
  return useQuery({
    queryKey: ['gallery', filters],
    queryFn: () => fetchGalleryPhotos(filters),
    staleTime: 5 * 60 * 1000, // 5分钟内复用缓存
    gcTime: 30 * 60 * 1000, // 缓存保留30分钟
  });
}

/**
 * 预加载下一页
 */
export function usePrefetchNextPage(filters: FetchGalleryFilters) {
  const queryClient = useQueryClient();

  return () => {
    const nextFilters = {
      ...filters,
      offset: (filters.offset || 0) + 50,
    };

    queryClient.prefetchQuery({
      queryKey: ['gallery', nextFilters],
      queryFn: () => fetchGalleryPhotos(nextFilters),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * 使画廊缓存失效（上传/删除后调用）
 */
export function useInvalidateGallery() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['gallery'] });
  };
}
