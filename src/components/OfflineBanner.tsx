import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

export const OfflineBanner = () => {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!online) {
      setShow(true);
      wasOffline.current = true;
    } else {
      setShow(false);
      if (wasOffline.current) {
        toast.success("Back online");
        wasOffline.current = false;
      }
    }
  }, [online]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/5 backdrop-blur-sm border border-amber-400/40 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm text-white shadow-lg"
        >
          <WifiOff className="h-4 w-4 text-amber-400" />
          No internet connection — some features may be unavailable
        </motion.div>
      )}
    </AnimatePresence>
  );
};
