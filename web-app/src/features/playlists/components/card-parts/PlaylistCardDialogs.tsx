import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
import { History } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { DiffViewer } from '../DiffViewer';

interface PlaylistCardDialogsProps {
  config: PlaylistConfig;
  isDeleting: boolean;
  isLoadingLog: boolean;
  latestLog: ActivityLog | null;
  onDelete: () => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowHistory: (show: boolean) => void;
  showDeleteDialog: boolean;
  showHistory: boolean;
}

export const PlaylistCardDialogs = ({
  config,
  isDeleting,
  isLoadingLog,
  latestLog,
  onDelete,
  setShowDeleteDialog,
  setShowHistory,
  showDeleteDialog,
  showHistory
}: PlaylistCardDialogsProps) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist from App?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>"{config.name}"</strong> from your Smart Curator dashboard.
              <br />
              <br />
              <strong>Your Spotify playlist will NOT be affected.</strong> This only deletes the
              automation configuration from this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete from App'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History / Diff Dialog */}
      {latestLog?.metadata?.diff && (
        <Dialog onOpenChange={setShowHistory} open={showHistory}>
          <DialogContent className="flex h-[85vh] max-h-[90vh] max-w-7xl flex-col">
            <DialogHeader>
              <DialogTitle>Curation History: {config.name}</DialogTitle>
              <DialogDescription>
                Changes from the latest {latestLog?.metadata?.dryRun ? 'test' : 'automation'} run ({' '}
                {latestLog?.timestamp ? new Date(latestLog.timestamp).toLocaleString() : 'Just now'}
                )
              </DialogDescription>
            </DialogHeader>
            <div className="h-full min-h-0 flex-1 overflow-y-auto py-4 pr-1 md:overflow-hidden">
              {isLoadingLog ? (
                <div className="flex h-full items-center justify-center">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              ) : latestLog?.metadata?.diff ? (
                <div className="flex h-full flex-col">
                  <DiffViewer diff={latestLog.metadata.diff} isDryRun={latestLog.metadata.dryRun} />
                </div>
              ) : (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <History className="mb-2 h-10 w-10 opacity-50" />
                  <p>No details available for this run.</p>
                  <p className="text-muted-foreground/60 text-xs">
                    Log entry may have been deleted.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-4 sm:flex-row">
              {latestLog?.metadata?.diff?.stats && (
                <div className="text-muted-foreground flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium">
                  <span>
                    Target:{' '}
                    <span className="text-foreground">{latestLog.metadata.diff.stats.target}</span>
                  </span>
                  <span className="text-lg leading-none opacity-20">|</span>
                  <span>
                    Final:{' '}
                    <span className="text-foreground">{latestLog.metadata.diff.stats.final}</span>
                  </span>
                  <span className="text-lg leading-none opacity-20">|</span>
                  <span className="flex items-center gap-1.5">
                    Success:
                    {latestLog.metadata.diff.stats.success ? (
                      <Badge className="h-5 border-0 bg-green-500/20 px-1.5 text-green-500 hover:bg-green-500/30">
                        Yes
                      </Badge>
                    ) : (
                      <Badge className="h-5 px-1.5" variant="destructive">
                        No
                      </Badge>
                    )}
                  </span>
                </div>
              )}
              <Button className="w-full sm:w-auto" onClick={() => setShowHistory(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
