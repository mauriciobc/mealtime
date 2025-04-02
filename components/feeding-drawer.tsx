import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FeedingLogItem } from "./feeding-log-item";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { FeedingForm } from "./feeding-form";
import { BaseFeedingLog, BaseCat, BaseUser } from "@/lib/types/common";
import { FeedingLog } from "@/lib/types";

interface FeedingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  feedingLog: FeedingLog;
}

export function FeedingDrawer({ isOpen, onOpenChange, feedingLog }: FeedingDrawerProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Transform FeedingLog into BaseFeedingLog with optional cat and user
  const transformedLog: BaseFeedingLog & { cat?: BaseCat; user?: BaseUser } = {
    id: feedingLog.id,
    catId: feedingLog.catId,
    userId: feedingLog.userId,
    timestamp: new Date(feedingLog.timestamp),
    portionSize: feedingLog.portionSize,
    notes: feedingLog.notes,
    status: feedingLog.status,
    createdAt: new Date(feedingLog.createdAt),
    cat: feedingLog.cat ? {
      id: feedingLog.cat.id,
      name: feedingLog.cat.name,
      photoUrl: feedingLog.cat.photoUrl,
      birthdate: feedingLog.cat.birthdate ? new Date(feedingLog.cat.birthdate) : undefined,
      weight: feedingLog.cat.weight,
      restrictions: feedingLog.cat.restrictions,
      notes: feedingLog.cat.notes,
      householdId: feedingLog.cat.householdId,
      feedingInterval: feedingLog.cat.feedingInterval,
      portion_size: feedingLog.cat.portion_size
    } : undefined,
    user: feedingLog.user ? {
      id: feedingLog.user.id,
      name: feedingLog.user.name,
      email: feedingLog.user.email,
      avatar: feedingLog.user.avatar,
      householdId: feedingLog.user.householdId,
      preferences: feedingLog.user.preferences,
      role: feedingLog.user.role
    } : undefined
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <DrawerHeader>
              <div className="flex items-center justify-between mb-2">
                <DrawerTitle>
                  Detalhes da Alimentação
                </DrawerTitle>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                  aria-label="Fechar detalhes"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <DrawerDescription>
                Visualize informações detalhadas sobre a última alimentação registrada
              </DrawerDescription>
            </DrawerHeader>
            {transformedLog && transformedLog.cat && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FeedingForm
                  catId={transformedLog.cat.id}
                  catPortionSize={transformedLog.cat.portion_size}
                  onSuccess={() => onOpenChange(false)}
                />
                <FeedingLogItem
                  log={transformedLog}
                  onView={() => {
                    onOpenChange(false);
                    router.push(`/feedings/${transformedLog.id}`);
                  }}
                  onEdit={() => {
                    onOpenChange(false);
                    router.push(`/feedings/${transformedLog.id}/edit`);
                  }}
                  onDelete={() => {
                    // Função para excluir o registro
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 