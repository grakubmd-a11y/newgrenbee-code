"use client";
/**
 * SchedulePicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Monthly calendar + hourly time slot picker for the booking wizard.
 */

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Constants ────────────────────────────────────────────────────────────────

export const HOUR_SLOTS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

const MAX_ADVANCE_DAYS = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotInfo = { available: boolean; slotsRemaining: number };

interface Props {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  slotsMap: Record<string, SlotInfo>;
  slotsLoading: boolean;
  busyDates?: Set<string>;
  sameDayFee?: number;
  onMonthChange?: (year: number, month: number) => void;
}

interface CalendarCell {
  rawDate: string;
  label: number;
  disabled: boolean;
  isToday: boolean;
  isEmpty: boolean;
}

function buildCells(cursor: Date, today: Date, maxDate: Date): CalendarCell[] {
  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startOffset;
    if (dayOffset < 0 || dayOffset >= daysInMonth) {
      cells.push({ rawDate: "", label: 0, disabled: true, isToday: false, isEmpty: true });
      continue;
    }
    const d = new Date(year, month, dayOffset + 1);
    const rawDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayOffset + 1).padStart(2, "0")}`;
    cells.push({
      rawDate,
      label: dayOffset + 1,
      disabled: d < today || d > maxDate,
      isToday: d.toDateString() === today.toDateString(),
      isEmpty: false,
    });
  }
  return cells;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  slotsMap,
  slotsLoading,
  busyDates,
  sameDayFee,
  onMonthChange,
}: Props) {
  const { t, i18n } = useTranslation();

  // Locale for Intl formatters — map i18next lang to BCP-47
  const locale = i18n.language?.startsWith("es") ? "es-US" : "en-US";

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + MAX_ADVANCE_DAYS);
    return d;
  }, [today]);

  // Locale-aware weekday headers (Mo, Tu, …) using Intl
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // Build Mon–Sun sequence (ISO week starts Monday)
    const monday = new Date(2024, 0, 1); // 2024-01-01 is a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return fmt.format(d).slice(0, 2);
    });
  }, [locale]);

  const [cursor, setCursor] = useState<Date>(() => {
    if (selectedDate) {
      const base = new Date(selectedDate + "T00:00:00");
      return new Date(base.getFullYear(), base.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const canGoPrev = useMemo(() => {
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevStart      = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    return prevStart >= thisMonthStart;
  }, [cursor, today]);

  const canGoNext = useMemo(() => {
    const maxMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const nextStart     = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return nextStart <= maxMonthStart;
  }, [cursor, maxDate]);

  const cells = useMemo(() => buildCells(cursor, today, maxDate), [cursor, today, maxDate]);

  // Locale-aware month + year label
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor);
  }, [cursor, locale]);

  React.useEffect(() => {
    onMonthChange?.(cursor.getFullYear(), cursor.getMonth() + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  return (
    <div className="space-y-5">
      {/* ── Month navigation ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between select-none">
        <button
          type="button"
          onClick={() => canGoPrev && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-transparent hover:bg-gray-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft size={15} className="text-gray-700" />
        </button>

        <span className="text-sm font-bold text-gray-900 tracking-tight capitalize">{monthLabel}</span>

        <button
          type="button"
          onClick={() => canGoNext && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={!canGoNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-transparent hover:bg-gray-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight size={15} className="text-gray-700" />
        </button>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => {
            if (cell.isEmpty) return <div key={i} className="h-9" />;

            const isSelected         = selectedDate === cell.rawDate;
            const isBusy             = !cell.disabled && (busyDates?.has(cell.rawDate) ?? false);
            const effectivelyDisabled = cell.disabled || isBusy;
            const showBusy    = isBusy;
            const showSameDay = !isBusy && cell.isToday && !!sameDayFee;

            return (
              <div key={cell.rawDate} className="relative group">
                <button
                  type="button"
                  disabled={effectivelyDisabled}
                  onClick={() => !effectivelyDisabled && onDateChange(cell.rawDate)}
                  className={`h-9 w-full rounded-lg text-xs font-semibold transition-all border border-transparent ${
                    effectivelyDisabled
                      ? isBusy
                        ? "text-gray-300 line-through decoration-gray-300 cursor-not-allowed"
                        : "text-gray-200 cursor-not-allowed"
                      : isSelected
                      ? "bg-brand text-white font-bold shadow-sm shadow-brand/30"
                      : cell.isToday
                      ? "border-brand/60 text-brand font-bold hover:bg-brand/10 cursor-pointer"
                      : "text-gray-700 hover:bg-brand/10 hover:text-brand cursor-pointer"
                  }`}
                >
                  {cell.label}
                </button>

                {/* Fully-booked tooltip */}
                {showBusy && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                    <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      {t("schedule.occupied")}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}

                {/* Same-day surcharge tooltip */}
                {showSameDay && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 whitespace-nowrap">
                    <div className="bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      {t("schedule.sameDaySurcharge", { fee: sameDayFee })}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Time slots ────────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">
              {t("schedule.arrivalTime")}
            </p>
            {slotsLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {HOUR_SLOTS.map(({ value, label }) => {
              const info       = slotsMap[value];
              const isOccupied = info ? !info.available : false;
              const isSelected = selectedTime === value;

              return (
                <div key={value} className="relative group">
                  <button
                    type="button"
                    disabled={isOccupied}
                    onClick={() => !isOccupied && onTimeChange(value)}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isOccupied
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through decoration-gray-300"
                        : isSelected
                        ? "border-brand bg-brand text-white shadow-sm shadow-brand/25 cursor-pointer"
                        : "border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand hover:bg-brand/5 cursor-pointer"
                    }`}
                  >
                    {label}
                  </button>

                  {isOccupied && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20">
                      <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {t("schedule.occupied")}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Availability legend */}
          {!slotsLoading && Object.keys(slotsMap).length > 0 && (
            <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block" /> {t("schedule.available")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 inline-block" /> {t("schedule.unavailable")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
