import { AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface UnlinkAccountDialogProps {
  isOpen: boolean;
  onConfirm: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}

export const UnlinkAccountDialog = ({
  isOpen,
  onConfirm,
  onOpenChange
}: UnlinkAccountDialogProps) => {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-destructive/10 rounded-full p-2">
              <AlertTriangle className="text-destructive h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Unlink Spotify Account?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
            This will stop all automated playlist curations and clear your Spotify profile data from
            our system.
            <span className="text-destructive/80 mt-2 block font-medium italic">
              You'll need to re-link your account to resume automation.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
          <AlertDialogCancel className="border-white/10 bg-white/5 text-white transition-all hover:bg-white/10">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20 font-semibold shadow-lg transition-all active:scale-95"
            onClick={onConfirm}
          >
            Unlink Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
