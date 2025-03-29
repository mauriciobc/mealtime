import { Drawer } from "vaul";
import { FeedingLogItem } from "./feeding-log-item";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface FeedingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  feedingLog: any;
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

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Drawer.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
            </motion.div>
          )}
        </AnimatePresence>
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[96vh] mt-24 fixed bottom-0 left-0 right-0 border-t">
          <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-8" />
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <Drawer.Title className="text-xl font-semibold text-foreground">
                  Detalhes da Alimentação
                </Drawer.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                  aria-label="Fechar detalhes"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <Drawer.Description className="text-sm text-muted-foreground mb-4">
                Visualize informações detalhadas sobre a última alimentação registrada
              </Drawer.Description>
              {feedingLog && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FeedingLogItem
                    log={{
                      ...feedingLog,
                      createdAt: feedingLog.timestamp,
                      cat: feedingLog.cat ? {
                        ...feedingLog.cat,
                        householdId: feedingLog.cat.householdId || 0,
                        feeding_interval: feedingLog.cat.feeding_interval || 0
                      } : undefined,
                      user: feedingLog.user ? {
                        id: feedingLog.user.id,
                        name: feedingLog.user.name,
                        email: feedingLog.user.email,
                        avatar: feedingLog.user.avatar,
                        householdId: feedingLog.user.households?.[0] ? parseInt(feedingLog.user.households[0]) : null,
                        preferences: {
                          timezone: "America/Sao_Paulo",
                          language: "pt-BR",
                          notifications: {
                            pushEnabled: true,
                            emailEnabled: true,
                            feedingReminders: true,
                            missedFeedingAlerts: true,
                            householdUpdates: true
                          }
                        },
                        role: feedingLog.user.role || "user"
                      } : undefined
                    }}
                    onView={() => {
                      onOpenChange(false);
                      router.push(`/feedings/${feedingLog.id}`);
                    }}
                    onEdit={() => {
                      onOpenChange(false);
                      router.push(`/feedings/${feedingLog.id}/edit`);
                    }}
                    onDelete={() => {
                      // Função para excluir o registro
                    }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
} 