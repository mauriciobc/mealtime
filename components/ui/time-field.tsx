"use client";

import React, { useReducer } from "react";
import { Input } from "@/components/ui/input";

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type TimeFieldState = { hours: string; minutes: string };

type TimeFieldAction =
  | { type: 'SYNC_FROM_VALUE'; value: string }
  | { type: 'SET_HOURS'; hours: string }
  | { type: 'SET_MINUTES'; minutes: string };

function parseTimeValue(value: string): TimeFieldState {
  if (!value) return { hours: "", minutes: "" };
  const [h, m] = value.split(":");
  return { hours: h || "", minutes: m || "" };
}

function timeFieldReducer(state: TimeFieldState, action: TimeFieldAction): TimeFieldState {
  switch (action.type) {
    case 'SYNC_FROM_VALUE':
      return parseTimeValue(action.value);
    case 'SET_HOURS':
      return { ...state, hours: action.hours };
    case 'SET_MINUTES':
      return { ...state, minutes: action.minutes };
    default:
      return state;
  }
}

export function TimeField({ value, onChange, disabled = false }: TimeFieldProps) {
  const [state, dispatch] = useReducer(timeFieldReducer, value, parseTimeValue);
  const { hours, minutes } = state;

  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    dispatch({ type: 'SYNC_FROM_VALUE', value });
  }

  const updateValue = (newHours: string, newMinutes: string) => {
    if (newHours && newMinutes) {
      onChange(`${newHours.padStart(2, "0")}:${newMinutes.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value;
    if (newHours === "" || (parseInt(newHours) >= 0 && parseInt(newHours) <= 23)) {
      dispatch({ type: 'SET_HOURS', hours: newHours });
      updateValue(newHours, minutes);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value;
    if (newMinutes === "" || (parseInt(newMinutes) >= 0 && parseInt(newMinutes) <= 59)) {
      dispatch({ type: 'SET_MINUTES', minutes: newMinutes });
      updateValue(hours, newMinutes);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max="23"
        placeholder="HH"
        value={hours}
        onChange={handleHoursChange}
        className="w-16 text-center"
        disabled={disabled}
      />
      <span className="text-lg">:</span>
      <Input
        type="number"
        min="0"
        max="59"
        placeholder="MM"
        value={minutes}
        onChange={handleMinutesChange}
        className="w-16 text-center"
        disabled={disabled}
      />
    </div>
  );
}
