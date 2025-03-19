"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cat, Calendar, PieChart, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  {
    path: "/",
    label: "Home",
    icon: Home,
  },
  {
    path: "/cats",
    label: "Gatos",
    icon: Cat,
  },
  {
    path: "/feedings",
    label: "Alimentações",
    icon: Calendar,
  },
  {
    path: "/statistics",
    label: "Estatísticas",
    icon: BarChart3,
  },
  {
    path: "/households",
    label: "Residências",
    icon: Users,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full h-16 bg-background border-t lg:hidden">
      <div className="grid h-full grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Icon className="h-6 w-6" />
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 h-1 w-4 bg-primary rounded-full"
                    layoutId="bottomNavIndicator"
                    style={{ x: "-50%" }}
                    transition={{ duration: 0.3, type: "spring" }}
                  />
                )}
              </motion.div>
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 