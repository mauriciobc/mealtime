"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionOnClick?: () => void;
  className?: string;
  variant?: "default" | "cat" | "schedule" | "households" | "feeding";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionOnClick,
  className,
  variant = "default",
}: EmptyStateProps) {
  // Add a check for the Icon component
  if (!Icon) {
    console.error("EmptyState received an undefined icon prop. Title:", title);
    // Optionally return null or a fallback UI
    return null; 
    // Or return <p>Error: Icon missing for '{title}'</p>;
  }

  // Cores baseadas na variante
  const getVariantStyles = () => {
    switch (variant) {
      case "cat":
        return {
          iconBg: "bg-purple-100",
          iconColor: "text-purple-500",
          borderColor: "border-purple-200",
        };
      case "schedule":
        return {
          iconBg: "bg-amber-100",
          iconColor: "text-amber-500",
          borderColor: "border-amber-200",
        };
      case "households":
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-500",
          borderColor: "border-blue-200",
        };
      case "feeding":
        return {
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-500",
          borderColor: "border-emerald-200",
        };
      default:
        return {
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
          borderColor: "border-border",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-lg bg-background",
        styles.borderColor,
        className
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-8 w-8", styles.iconColor)} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

      <div className="flex flex-wrap gap-3 justify-center">
        {actionLabel && (
          <Button
            onClick={actionOnClick}
            asChild
          >
            {actionHref ? (
              <Link href={actionHref}>{actionLabel}</Link>
            ) : (
              <span>{actionLabel}</span>
            )}
          </Button>
        )}

        {secondaryActionLabel && (
          <Button
            variant="outline"
            onClick={secondaryActionOnClick}
            asChild
          >
            {secondaryActionHref ? (
              <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
            ) : (
              <span>{secondaryActionLabel}</span>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
} 