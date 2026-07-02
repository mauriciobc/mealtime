/**
 * Simple Time Picker
 * Check out the live demo at https://shadcn-datetime-picker-pro.vercel.app/
 * Find the latest source code at https://github.com/huybuidac/shadcn-datetime-picker
 */
import { useCallback, useEffect, useId, useMemo, useReducer, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Clock, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  format,
  parse,
  setHours,
  startOfHour,
  endOfHour,
  setMinutes,
  startOfMinute,
  endOfMinute,
  setSeconds,
  startOfDay,
  endOfDay,
  addHours,
  subHours,
  setMilliseconds,
} from 'date-fns';
import { useUserContext } from "@/lib/context/UserContext"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"

interface SimpleTimeOption {
  value: any;
  label: string;
  disabled?: boolean;
}

const AM_VALUE = 0;
const PM_VALUE = 1;

type SimpleTimePickerState = {
  ampm: number;
  hour: number;
  minute: number;
  second: number;
  open: boolean;
};

type SimpleTimePickerAction =
  | { type: 'SET_HOUR'; value: number; minute?: number; second?: number }
  | { type: 'SET_MINUTE'; value: number; second?: number }
  | { type: 'SET_SECOND'; value: number }
  | { type: 'SET_AMPM'; value: number; hour?: number; minute?: number; second?: number }
  | { type: 'SET_OPEN'; value: boolean };

function simpleTimePickerReducer(state: SimpleTimePickerState, action: SimpleTimePickerAction): SimpleTimePickerState {
  switch (action.type) {
    case 'SET_HOUR':
      return {
        ...state,
        hour: action.value,
        ...(action.minute !== undefined ? { minute: action.minute } : {}),
        ...(action.second !== undefined ? { second: action.second } : {}),
      };
    case 'SET_MINUTE':
      return {
        ...state,
        minute: action.value,
        ...(action.second !== undefined ? { second: action.second } : {}),
      };
    case 'SET_SECOND':
      return { ...state, second: action.value };
    case 'SET_AMPM':
      return {
        ...state,
        ampm: action.value,
        ...(action.hour !== undefined ? { hour: action.hour } : {}),
        ...(action.minute !== undefined ? { minute: action.minute } : {}),
        ...(action.second !== undefined ? { second: action.second } : {}),
      };
    case 'SET_OPEN':
      return { ...state, open: action.value };
    default:
      return state;
  }
}

export function SimpleTimePicker({
  value,
  onChange,
  use12HourFormat,
  min,
  max,
  disabled,
  modal,
}: {
  use12HourFormat?: boolean;
  value: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  modal?: boolean;
}) {
  const { state: userState } = useUserContext();
  const userLanguage = userState.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);
  // hours24h = HH
  // hours12h = hh
  const formatStr = use12HourFormat ? 'yyyy-MM-dd hh:mm:ss.SSS a xxxx' : 'yyyy-MM-dd HH:mm:ss.SSS xxxx';
  const [state, dispatch] = useReducer(simpleTimePickerReducer, value, (initialValue) => ({
    ampm: format(initialValue, 'a') === 'AM' ? AM_VALUE : PM_VALUE,
    hour: use12HourFormat ? +format(initialValue, 'hh') : initialValue.getHours(),
    minute: initialValue.getMinutes(),
    second: initialValue.getSeconds(),
    open: false,
  }));
  const { ampm, hour, minute, second, open } = state;

  useEffect(() => {
    onChange(buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm }));
  }, [hour, minute, second, ampm, formatStr, use12HourFormat, onChange, value]);

  const _hourIn24h = use12HourFormat ? (hour % 12) + ampm * 12 : hour;

  const hours: SimpleTimeOption[] = useMemo(
    () =>
      Array.from({ length: use12HourFormat ? 12 : 24 }, (_, i) => {
        let disabled = false;
        const hourValue = use12HourFormat ? (i === 0 ? 12 : i) : i;
        const hDate = setHours(value, use12HourFormat ? i + ampm * 12 : i);
        const hStart = startOfHour(hDate);
        const hEnd = endOfHour(hDate);
        if (min && hEnd < min) disabled = true;
        if (max && hStart > max) disabled = true;
        return {
          value: hourValue,
          label: hourValue.toString().padStart(2, '0'),
          disabled,
        };
      }),
    [value, min, max, use12HourFormat, ampm]
  );
  const minutes: SimpleTimeOption[] = useMemo(() => {
    const anchorDate = setHours(value, _hourIn24h);
    return Array.from({ length: 60 }, (_, i) => {
      let disabled = false;
      const mDate = setMinutes(anchorDate, i);
      const mStart = startOfMinute(mDate);
      const mEnd = endOfMinute(mDate);
      if (min && mEnd < min) disabled = true;
      if (max && mStart > max) disabled = true;
      return {
        value: i,
        label: i.toString().padStart(2, '0'),
        disabled,
      };
    });
  }, [value, min, max, _hourIn24h]);
  const seconds: SimpleTimeOption[] = useMemo(() => {
    const anchorDate = setMilliseconds(setMinutes(setHours(value, _hourIn24h), minute), 0);
    const _min = min ? setMilliseconds(min, 0) : undefined;
    const _max = max ? setMilliseconds(max, 0) : undefined;
    return Array.from({ length: 60 }, (_, i) => {
      let disabled = false;
      const sDate = setSeconds(anchorDate, i);
      if (_min && sDate < _min) disabled = true;
      if (_max && sDate > _max) disabled = true;
      return {
        value: i,
        label: i.toString().padStart(2, '0'),
        disabled,
      };
    });
  }, [value, minute, min, max, _hourIn24h]);
  const ampmOptions = useMemo(() => {
    const startD = startOfDay(value);
    const endD = endOfDay(value);
    return [
      { value: AM_VALUE, label: 'AM' },
      { value: PM_VALUE, label: 'PM' },
    ].map((v) => {
      let disabled = false;
      const start = addHours(startD, v.value * 12);
      const end = subHours(endD, (1 - v.value) * 12);
      if (min && end < min) disabled = true;
      if (max && start > max) disabled = true;
      return { ...v, disabled };
    });
  }, [value, min, max]);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        hourRef.current?.scrollIntoView({ behavior: 'auto' });
        minuteRef.current?.scrollIntoView({ behavior: 'auto' });
        secondRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }, 1);
    return () => clearTimeout(timeoutId);
     
  }, [open]);
  const onHourChange = useCallback(
    (v: SimpleTimeOption) => {
      let nextMinute = minute;
      let nextSecond = second;
      if (min) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour: v.value, minute, second, ampm });
        if (newTime < min) {
          nextMinute = min.getMinutes();
          nextSecond = min.getSeconds();
        }
      }
      if (max) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour: v.value, minute: nextMinute, second: nextSecond, ampm });
        if (newTime > max) {
          nextMinute = max.getMinutes();
          nextSecond = max.getSeconds();
        }
      }
      dispatch({ type: 'SET_HOUR', value: v.value, minute: nextMinute, second: nextSecond });
    },
    [use12HourFormat, value, formatStr, minute, second, ampm, min, max]
  );

  const onMinuteChange = useCallback(
    (v: SimpleTimeOption) => {
      let nextSecond = second;
      if (min) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour, minute: v.value, second, ampm });
        if (newTime < min) {
          nextSecond = min.getSeconds();
        }
      }
      if (max) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour, minute: v.value, second: nextSecond, ampm });
        if (newTime > max) {
          nextSecond = newTime.getSeconds();
        }
      }
      dispatch({ type: 'SET_MINUTE', value: v.value, second: nextSecond });
    },
    [use12HourFormat, value, formatStr, hour, second, ampm, min, max]
  );

  const onAmpmChange = useCallback(
    (v: SimpleTimeOption) => {
      let nextHour = hour;
      let nextMinute = minute;
      let nextSecond = second;
      if (min) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm: v.value });
        if (newTime < min) {
          const minH = min.getHours() % 12;
          nextHour = minH === 0 ? 12 : minH;
          nextMinute = min.getMinutes();
          nextSecond = min.getSeconds();
        }
      }
      if (max) {
        const newTime = buildTime({ use12HourFormat, value, formatStr, hour: nextHour, minute: nextMinute, second: nextSecond, ampm: v.value });
        if (newTime > max) {
          const maxH = max.getHours() % 12;
          nextHour = maxH === 0 ? 12 : maxH;
          nextMinute = max.getMinutes();
          nextSecond = max.getSeconds();
        }
      }
      dispatch({ type: 'SET_AMPM', value: v.value, hour: nextHour, minute: nextMinute, second: nextSecond });
    },
    [use12HourFormat, value, formatStr, hour, minute, second, min, max]
  );

  const display = useMemo(() => {
    return format(value, use12HourFormat ? 'hh:mm:ss a' : 'HH:mm:ss');
  }, [value, use12HourFormat]);

  const listboxId = useId();

  return (
    <Popover open={open} onOpenChange={(value) => dispatch({ type: 'SET_OPEN', value })} modal={modal}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          className={cn(
            'flex h-9 px-3 items-center justify-between cursor-pointer font-normal border border-input rounded-md text-sm shadow-sm',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          tabIndex={0}
        >
          <Clock className="mr-2 size-4" />
          {display}
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent id={listboxId} className="p-0" side="top">
        <div className="flex-col gap-2 p-2">
          <div className="flex h-56 grow">
            <ScrollArea className="h-full flex-grow">
              <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                {hours.map((v) => (
                  <div ref={v.value === hour ? hourRef : undefined} key={v.value}>
                    <TimeItem
                      option={v}
                      selected={v.value === hour}
                      onSelect={onHourChange}
                      disabled={v.disabled}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <ScrollArea className="h-full flex-grow">
              <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                {minutes.map((v) => (
                  <div ref={v.value === minute ? minuteRef : undefined} key={v.value}>
                    <TimeItem
                      option={v}
                      selected={v.value === minute}
                      onSelect={onMinuteChange}
                      disabled={v.disabled}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <ScrollArea className="h-full flex-grow">
              <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                {seconds.map((v) => (
                  <div ref={v.value === second ? secondRef : undefined} key={v.value}>
                    <TimeItem
                      option={v}
                      selected={v.value === second}
                      onSelect={(v) => dispatch({ type: 'SET_SECOND', value: v.value })}
                      className="h-8"
                      disabled={v.disabled}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            {use12HourFormat && (
              <ScrollArea className="h-full flex-grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2">
                  {ampmOptions.map((v) => (
                    <TimeItem
                      key={v.value}
                      option={v}
                      selected={v.value === ampm}
                      onSelect={onAmpmChange}
                      className="h-8"
                      disabled={v.disabled}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const TimeItem = ({
  option,
  selected,
  onSelect,
  className,
  disabled,
}: {
  option: SimpleTimeOption;
  selected: boolean;
  onSelect: (option: SimpleTimeOption) => void;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <Button
      variant="ghost"
      className={cn('flex justify-center px-1 pe-2 ps-1', className)}
      onClick={() => onSelect(option)}
      disabled={disabled}
    >
      <div className="w-4">{selected && <CheckIcon className="my-auto size-4" />}</div>
      <span className="ms-2">{option.label}</span>
    </Button>
  );
};

interface BuildTimeOptions {
  use12HourFormat?: boolean;
  value: Date;
  formatStr: string;
  hour: number;
  minute: number;
  second: number;
  ampm: number;
}

function buildTime(options: BuildTimeOptions) {
  const { use12HourFormat, value, formatStr, hour, minute, second, ampm } = options;
  let date: Date;
  if (use12HourFormat) {
    const dateStrRaw = format(value, formatStr);
    // yyyy-MM-dd hh:mm:ss.SSS a zzzz
    // 2024-10-14 01:20:07.524 AM GMT+00:00
    let dateStr = dateStrRaw.slice(0, 11) + hour.toString().padStart(2, '0') + dateStrRaw.slice(13);
    dateStr = dateStr.slice(0, 14) + minute.toString().padStart(2, '0') + dateStr.slice(16);
    dateStr = dateStr.slice(0, 17) + second.toString().padStart(2, '0') + dateStr.slice(19);
    dateStr = dateStr.slice(0, 24) + (ampm == AM_VALUE ? 'AM' : 'PM') + dateStr.slice(26);
    date = parse(dateStr, formatStr, new Date());
  } else {
    date = setHours(setMinutes(setSeconds(setMilliseconds(value, 0), second), minute), hour);
  }
  return date;
}