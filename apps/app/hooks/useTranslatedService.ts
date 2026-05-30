/**
 * useTranslatedService — returns a Service with text fields translated
 * to the current i18n language (currently only ES is mapped; EN = passthrough).
 *
 * Usage:
 *   const translated = useTranslatedService(service);
 *   // translated.name, .tagline, .description, .includedSpecs, .factors[*].label
 *   // are all in the active language. Prices/IDs/icons unchanged.
 */
"use client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Service, ServiceFactor } from "@grenbee/types";
import { SERVICES_I18N_ES } from "@grenbee/config/servicesI18n";

export function useTranslatedService(service: Service): Service {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  return useMemo(() => {
    if (!isEs) return service;
    const t = SERVICES_I18N_ES[service.id];
    if (!t) return service;

    const translatedFactors: ServiceFactor[] = service.factors.map((factor) => {
      const tf = t.factors?.[factor.name];
      if (!tf) return factor;
      return {
        ...factor,
        label: tf.label,
        options: factor.options.map((opt) => ({
          ...opt,
          label: tf.options?.[opt.label] ?? opt.label,
        })),
      };
    });

    return {
      ...service,
      name:          t.name          ?? service.name,
      tagline:       t.tagline       ?? service.tagline,
      description:   t.description   ?? service.description,
      unitName:      t.unitName      ?? service.unitName,
      unitLabel:     t.unitLabel     ?? service.unitLabel,
      includedSpecs: t.includedSpecs ?? service.includedSpecs,
      factors:       translatedFactors,
    };
  }, [service, isEs]);
}

/** Translate an array of services in one call. */
export function useTranslatedServices(services: Service[]): Service[] {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  return useMemo(() => {
    if (!isEs) return services;
    return services.map((svc) => {
      const t = SERVICES_I18N_ES[svc.id];
      if (!t) return svc;
      const translatedFactors: ServiceFactor[] = svc.factors.map((factor) => {
        const tf = t.factors?.[factor.name];
        if (!tf) return factor;
        return {
          ...factor,
          label: tf.label,
          options: factor.options.map((opt) => ({
            ...opt,
            label: tf.options?.[opt.label] ?? opt.label,
          })),
        };
      });
      return {
        ...svc,
        name:          t.name          ?? svc.name,
        tagline:       t.tagline       ?? svc.tagline,
        description:   t.description   ?? svc.description,
        unitName:      t.unitName      ?? svc.unitName,
        unitLabel:     t.unitLabel     ?? svc.unitLabel,
        includedSpecs: t.includedSpecs ?? svc.includedSpecs,
        factors:       translatedFactors,
      };
    });
  }, [services, isEs]);
}
