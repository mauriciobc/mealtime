"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CatType } from "@/lib/types";

const SCROLL_STEP = 240;
const DRAG_CLICK_THRESHOLD = 6;

interface DashboardCatsScrollProps {
  cats: CatType[];
  fedCatIds: string[];
}

export function DashboardCatsScroll({ cats, fedCatIds }: DashboardCatsScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const updateScrollAffordances = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollAffordances();
    el.addEventListener("scroll", updateScrollAffordances, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollAffordances);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollAffordances);
      resizeObserver.disconnect();
    };
  }, [cats.length, updateScrollAffordances]);

  const scrollByDirection = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD) {
      drag.moved = true;
    }
    el.scrollLeft = drag.startScrollLeft - deltaX;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressClickRef.current = true;
    }
    dragRef.current = null;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  };

  const onItemClickCapture = (event: ReactMouseEvent) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  const showAffordances = canScrollLeft || canScrollRight;

  return (
    <div className="relative min-w-0 max-w-full">
      <div
        ref={scrollerRef}
        className={cn(
          "flex items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-smooth",
          "pb-2",
          // Reserva exatamente a largura do botão — sem faixa extra de fundo nas laterais
          showAffordances ? "pl-10 pr-10 md:pl-12 md:pr-12" : "px-0",
          "cursor-grab active:cursor-grabbing select-none",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onItemClickCapture}
      >
        {cats.map((cat) => (
          <TooltipProvider key={cat.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/cats/${cat.id}`}
                  draggable={false}
                  className="flex-shrink-0 w-20 md:w-24 group self-stretch"
                >
                  <div className="relative mx-auto w-fit">
                    <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 ring-transparent group-hover:ring-primary group-hover:scale-105 transition-all duration-200 rounded-2xl pointer-events-none">
                      <AvatarImage src={cat.photo_url || ""} alt={cat.name} className="object-cover" />
                      <AvatarFallback className="text-lg bg-secondary">
                        {cat.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {fedCatIds.includes(cat.id) && (
                      <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1">
                        <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-medium mt-2 text-center truncate max-w-full">
                    {cat.name}
                  </p>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver perfil de {cat.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        <Link
          href="/cats/new"
          draggable={false}
          className="flex-shrink-0 w-20 md:w-24 flex flex-col items-center justify-start self-stretch"
        >
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-secondary/50 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs mt-2 text-muted-foreground">Adicionar</p>
        </Link>
      </div>

      {showAffordances && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 md:w-24 bg-gradient-to-r from-background from-45% via-background/75 to-transparent"
          />
          <button
            type="button"
            aria-label="Rolar gatos para a esquerda"
            disabled={!canScrollLeft}
            onClick={() => scrollByDirection(-1)}
            className={cn(
              "absolute left-0 top-1/2 z-20 -translate-y-1/2",
              "w-10 md:w-12 h-16 md:h-20 rounded-2xl border border-border/60 bg-background",
              "flex flex-col items-center justify-center text-muted-foreground shadow-sm",
              "hover:text-foreground hover:border-primary/40 transition-colors",
              "disabled:opacity-30 disabled:pointer-events-none"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 md:w-24 bg-gradient-to-l from-background from-45% via-background/75 to-transparent"
          />
          <button
            type="button"
            aria-label="Rolar gatos para a direita"
            disabled={!canScrollRight}
            onClick={() => scrollByDirection(1)}
            className={cn(
              "absolute right-0 top-1/2 z-20 -translate-y-1/2",
              "w-10 md:w-12 h-16 md:h-20 rounded-2xl border border-border/60 bg-background",
              "flex flex-col items-center justify-center text-muted-foreground shadow-sm",
              "hover:text-foreground hover:border-primary/40 transition-colors",
              "disabled:opacity-30 disabled:pointer-events-none"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
