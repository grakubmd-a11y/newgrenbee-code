/**
 * SchedulePicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Monthly calendar + hourly time slot picker for the booking wizard.
 *
 * - Navigate forward/back by month (can't go before current month or past
 *   MAX_ADVANCE_DAYS into the future)
 * - Days in the past are grayed and not selectable
 * - When a day is clicked, hourly slots (8 AM – 5 PM) appear below
 * - Occupied slots show a strikethrough + "Ocupado" tooltip on hover
 * - Available slots can be selected; selected slot highlights in brand green
 */

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotInfo = { available: boolean; slotsRemaining: number };

interface Props {
  selectedDate: string;   // "YYYY-MM-DD"
  selectedTime: string;   // "08:00"
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  slotsMap: Record<string, SlotInfo>;
  slotsLoading: boolean;
}

// ─── Calendar cell ────────────────────────────────────────────────────────────

interface CalendarCell {
  rawDate: string;
  label: number;
  disabled: boolean;
  isToday: boolean;
  isEmpty: boolean;  // filler cell (padding before/after month)
}

function buildCells(cursor: Date, today: Date, maxDate: Date): CalendarCell[] {
  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay   = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ISO week starts on Monday (0 = Mon … 6 = Sun)
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
    const isToday   = d.toDateString() === today.toDateString();
    const isPast    = d < today;
    const isFuture  = d > maxDate;
    cells.push({
      rawDate,
      label: dayOffset + 1,
      disabled: isPast || isFuture,
      isToday,
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
}: Props) {
  // Use a stable today reference (midnight local)
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

  // Which month is the calendar showing
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
    const maxMonthStart  = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const nextStart      = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return nextStart <= maxMonthStart;
  }, [cursor, maxDate]);

  const cells = useMemo(() => buildCells(cursor, today, maxDate), [cursor, today, maxDate]);

  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

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

        <span className="text-sm font-bold text-gray-900 tracking-tight">{monthLabel}</span>

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
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => {
            if (cell.isEmpty) return <div key={i} className="h-9" />;

            const isSelected = selectedDate === cell.rawDate;

            return (
              <button
                key={cell.rawDate}
                type="button"
                disabled={cell.disabled}
                onClick={() => onDateChange(cell.rawDate)}
                className={`h-9 w-full rounded-lg text-xs font-semibold transition-all border border-transparent ${
                  cell.disabled
                    ? "text-gray-200 cursor-not-allowed"
                    : isSelected
                    ? "bg-brand text-white font-bold shadow-sm shadow-brand/30"
                    : cell.isToday
                    ? "border-brand/60 text-brand font-bold hover:bg-brand/10 cursor-pointer"
                    : "text-gray-700 hover:bg-brand/10 hover:text-brand cursor-pointer"
                }`}
              >
                {cell.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Time slots ────────────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">
              Arrival time
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

                  {/* "Ocupado" tooltip on hover (occupied only) */}
                  {isOccupied && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20">
                      <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">
                        Ocupado
                      </div>
                      {/* Arrow */}
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
                <span className="w-2.5 h-2.5 rounded-sm bg-brand inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 inline-block" /> Occupied
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
