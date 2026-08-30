import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../lib/utils';

type Props = {
  side: 'left' | 'right';
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  label: string;
  onChange: (width: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

export function PanelResizeHandle({
  side,
  value,
  min,
  max,
  defaultValue,
  label,
  onChange,
  onDraggingChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(value);
  const pointerId = useRef<number | null>(null);
  const previousCursor = useRef('');
  const previousUserSelect = useRef('');

  function finishDragging() {
    if (pointerId.current === null) return;
    pointerId.current = null;
    setDragging(false);
    onDraggingChange?.(false);
    document.body.style.cursor = previousCursor.current;
    document.body.style.userSelect = previousUserSelect.current;
  }

  useEffect(() => finishDragging, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerId.current = event.pointerId;
    startX.current = event.clientX;
    startWidth.current = value;
    previousCursor.current = document.body.style.cursor;
    previousUserSelect.current = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    onDraggingChange?.(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerId.current !== event.pointerId) return;
    const direction = side === 'left' ? 1 : -1;
    onChange(startWidth.current + (event.clientX - startX.current) * direction);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 32 : 8;
    let next: number | null = null;
    if (event.key === 'Home') next = min;
    if (event.key === 'End') next = max;
    if (event.key === 'ArrowLeft') next = value + (side === 'left' ? -step : step);
    if (event.key === 'ArrowRight') next = value + (side === 'left' ? step : -step);
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} pixels`}
      tabIndex={0}
      title={`${label} (flèches, Maj pour accélérer)`}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onLostPointerCapture={finishDragging}
      className={cn(
        'group absolute inset-y-0 z-30 hidden w-3 cursor-col-resize touch-none select-none outline-none md:block',
        side === 'left' ? '-right-1.5' : '-left-1.5',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
          dragging && 'opacity-100',
        )}
      />
    </div>
  );
}
