'use client';

import useSWR from 'swr';
import { useState, useEffect, useRef } from 'react';

const fetcher = async (key: string) => {
  const params = JSON.parse(key);
  const { _url, ...body } = params;
  const res = await fetch('/api/rent-estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

export interface UseRentEstimateParams {
  communeCode?: string | null;
  zipCode?: string;
  surface?: number | null;
  roomCount?: number;
  category?: string;
  isFurnished?: boolean;
  dpe?: string | null;
  floor?: number | null;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  constructionPeriod?: string | null;
  hasTerrace?: boolean;
  hasLoggia?: boolean;
  hasAirConditioning?: boolean;
  isKitchenEquipped?: boolean;
  hasCellar?: boolean;
  hasGarage?: boolean;
  hasGarden?: boolean;
  hasCourtyard?: boolean;
  propertySubType?: string | null;
}

export function useRentEstimate(params: UseRentEstimateParams) {
  const [debouncedParams, setDebouncedParams] =
    useState<UseRentEstimateParams>(params);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce 500ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedParams(params);
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.communeCode,
    params.zipCode,
    params.surface,
    params.roomCount,
    params.category,
    params.isFurnished,
    params.dpe,
    params.floor,
    params.hasElevator,
    params.hasParking,
    params.hasBalcony,
    params.constructionPeriod,
    params.hasTerrace,
    params.hasLoggia,
    params.hasAirConditioning,
    params.isKitchenEquipped,
    params.hasCellar,
    params.hasGarage,
    params.hasGarden,
    params.hasCourtyard,
    params.propertySubType,
  ]);

  // Build stable cache key
  const hasLocation = debouncedParams.communeCode || debouncedParams.zipCode;
  const hasSurface = debouncedParams.surface && debouncedParams.surface > 0;

  const cacheKey =
    hasLocation && hasSurface
      ? JSON.stringify({
          _url: '/api/rent-estimate',
          communeCode: debouncedParams.communeCode || undefined,
          zipCode: debouncedParams.zipCode || undefined,
          surface: debouncedParams.surface,
          roomCount: debouncedParams.roomCount || 1,
          category: debouncedParams.category || 'Appartement',
          isFurnished: debouncedParams.isFurnished || false,
          dpe: debouncedParams.dpe || undefined,
          floor: debouncedParams.floor ?? undefined,
          hasElevator: debouncedParams.hasElevator || false,
          hasParking: debouncedParams.hasParking || false,
          hasBalcony: debouncedParams.hasBalcony || false,
          constructionPeriod: debouncedParams.constructionPeriod || undefined,
          hasTerrace: debouncedParams.hasTerrace || false,
          hasLoggia: debouncedParams.hasLoggia || false,
          hasAirConditioning: debouncedParams.hasAirConditioning || false,
          isKitchenEquipped: debouncedParams.isKitchenEquipped || false,
          hasCellar: debouncedParams.hasCellar || false,
          hasGarage: debouncedParams.hasGarage || false,
          hasGarden: debouncedParams.hasGarden || false,
          hasCourtyard: debouncedParams.hasCourtyard || false,
          propertySubType: debouncedParams.propertySubType || undefined,
        })
      : null;

  const { data, error, isLoading } = useSWR(cacheKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const estimate = data?.available ? data : null;

  return {
    estimate,
    isLoading,
    error,
    isAvailable: data?.available ?? false,
  };
}
