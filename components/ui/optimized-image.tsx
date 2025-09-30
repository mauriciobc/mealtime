"use client";

import React, { useState } from 'react';
import { useOptimizedImage } from '@/lib/hooks/useOptimizedImage';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  placeholder?: 'blur' | 'skeleton' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  quality = 75,
  priority = false,
  className,
  containerClassName,
  placeholder = 'skeleton',
  blurDataURL,
  onLoad,
  onError,
  fallback
}: OptimizedImageProps) {
  const [showFallback, setShowFallback] = useState(false);
  
  const {
    src: optimizedSrc,
    srcSet,
    loading,
    placeholder: imagePlaceholder,
    onLoad: handleLoad,
    onError: handleError,
    isLoaded,
    isError,
    isInView,
    ref
  } = useOptimizedImage({
    src,
    alt,
    sizes,
    quality,
    priority,
    placeholder: placeholder === 'blur' ? 'blur' : 'empty',
    blurDataURL,
    onLoad: () => {
      onLoad?.();
    },
    onError: (error) => {
      setShowFallback(true);
      onError?.(error);
    }
  });

  if (isError || showFallback) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          containerClassName
        )}
        style={{ width, height }}
      >
        {fallback || (
          <div className="text-center p-4">
            <div className="text-sm">Imagem não encontrada</div>
          </div>
        )}
      </div>
    );
  }

  if (!isInView && !priority) {
    return (
      <div 
        ref={ref}
        className={cn(
          "flex items-center justify-center bg-muted",
          containerClassName
        )}
        style={{ width, height }}
      >
        {placeholder === 'skeleton' ? (
          <Skeleton className="w-full h-full" />
        ) : (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={cn("relative overflow-hidden", containerClassName)}
      style={{ width, height }}
    >
      {!isLoaded && placeholder === 'skeleton' && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {!isLoaded && placeholder === 'blur' && imagePlaceholder && (
        <img
          src={imagePlaceholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          style={{ transform: 'scale(1.1)' }}
        />
      )}

      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

// Componente especializado para avatares
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      {...props}
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      containerClassName="rounded-full overflow-hidden"
      placeholder="skeleton"
    />
  );
}

// Componente especializado para thumbnails
export function OptimizedThumbnail({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'>) {
  return (
    <OptimizedImage
      {...props}
      src={src}
      alt={alt}
      width={150}
      height={150}
      className={cn("rounded-lg", className)}
      containerClassName="rounded-lg overflow-hidden"
      placeholder="skeleton"
    />
  );
}