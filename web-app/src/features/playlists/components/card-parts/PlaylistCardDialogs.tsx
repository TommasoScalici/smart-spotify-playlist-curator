import { History } from 'lucide-react';

import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
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
  latestLog: ActivityLog | null;
  isLoadingLog: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  isDeleting: boolean;
  onDelete: () => void;
}

export const PlaylistCardDialogs = ({
  config,
  latestLog,
  isLoadingLog,
  showDeleteDialog,
  setShowDeleteDialog,
  showHistory,
  setShowHistory,
  isDeleting,
  onDelete
}: PlaylistCardDialogsProps) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={onDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete from App'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History / Diff Dialog */}
      {latestLog?.metadata?.diff && (
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-7xl h-[85vh] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Curation History: {config.name}</DialogTitle>
              <DialogDescription>
                Changes from the latest {latestLog?.metadata?.dryRun ? 'test' : 'automation'} run ({' '}
                {latestLog?.timestamp ? new Date(latestLog.timestamp).toLocaleString() : 'Just now'}
                )
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto md:overflow-hidden min-h-0 py-4 h-full pr-1">
              {isLoadingLog ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : latestLog?.metadata?.diff ? (
                <div className="flex flex-col h-full">
                  <DiffViewer diff={latestLog.metadata.diff} isDryRun={latestLog.metadata.dryRun} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <History className="h-10 w-10 mb-2 opacity-50" />
                  <p>No details available for this run.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Log entry may have been deleted.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
              {latestLog?.metadata?.diff?.stats && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground">
                  <span>
                    Target:{' '}
                    <span className="text-foreground">{latestLog.metadata.diff.stats.target}</span>
                  </span>
                  <span className="opacity-20 text-lg leading-none">|</span>
                  <span>
                    Final:{' '}
                    <span className="text-foreground">{latestLog.metadata.diff.stats.final}</span>
                  </span>
                  <span className="opacity-20 text-lg leading-none">|</span>
                  <span className="flex items-center gap-1.5">
                    Success:
                    {latestLog.metadata.diff.stats.success ? (
                      <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-0 h-5 px-1.5">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="h-5 px-1.5">
                        No
                      </Badge>
                    )}
                  </span>
                </div>
              )}
              <Button onClick={() => setShowHistory(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
