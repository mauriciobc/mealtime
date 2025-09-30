"use client";

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useVirtualization } from '@/lib/hooks/useVirtualization';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  onScrollToBottom?: () => void;
  threshold?: number;
}

export interface VirtualListRef {
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getScrollTop: () => number;
}

function VirtualListComponent<T>(
  {
    items,
    itemHeight,
    containerHeight,
    overscan = 5,
    className,
    itemClassName,
    renderItem,
    onScroll,
    onScrollToBottom,
    threshold = 100
  }: VirtualListProps<T>,
  ref: React.Ref<VirtualListRef>
) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  const {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    scrollToIndex: scrollToIndexInternal,
    isScrolling
  } = useVirtualization(items, {
    itemHeight,
    containerHeight,
    overscan
  });

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      scrollToIndexInternal(index);
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = index * itemHeight;
      }
    },
    scrollToTop: () => {
      setScrollTop(0);
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = 0;
      }
    },
    scrollToBottom: () => {
      const maxScrollTop = totalHeight - containerHeight;
      setScrollTop(maxScrollTop);
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = maxScrollTop;
      }
    },
    getScrollTop: () => scrollTop
  }));

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    // Detecta scroll para o final
    const isNearBottom = newScrollTop + containerHeight >= totalHeight - threshold;
    const wasScrollingDown = newScrollTop > lastScrollTopRef.current;
    
    if (isNearBottom && wasScrollingDown) {
      onScrollToBottom?.();
    }

    lastScrollTopRef.current = newScrollTop;
  };

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        "overflow-auto",
        isScrolling && "scroll-smooth",
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, start, data }) => (
          <div
            key={index}
            className={cn(
              "absolute w-full",
              itemClassName
            )}
            style={{
              height: itemHeight,
              top: start,
              transform: 'translateZ(0)' // Força aceleração de hardware
            }}
          >
            {renderItem(data, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListComponent) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> }
) => React.ReactElement;

// Hook para usar com listas de notificações
export function useNotificationList(notifications: any[], containerHeight: number = 400) {
  const virtualListRef = useRef<VirtualListRef>(null);

  const scrollToTop = () => {
    virtualListRef.current?.scrollToTop();
  };

  const scrollToBottom = () => {
    virtualListRef.current?.scrollToBottom();
  };

  const scrollToNotification = (index: number) => {
    virtualListRef.current?.scrollToIndex(index);
  };

  return {
    virtualListRef,
    scrollToTop,
    scrollToBottom,
    scrollToNotification,
    itemHeight: 80 // Altura estimada de cada notificação
  };
}