import { History } from 'lucide-react';

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
import { DiffViewer } from '@/features/playlists/components/DiffViewer';
import { ActivityLog } from '@/hooks/useActivityFeed';

interface ActivityDiffModalProps {
  activity: ActivityLog | null;
  onClose: () => void;
  open: boolean;
}

export const ActivityDiffModal = ({ activity, onClose, open }: ActivityDiffModalProps) => {
  return (
    <Dialog onOpenChange={(val) => !val && onClose()} open={open}>
      <DialogContent className="flex h-[85vh] max-h-[90vh] max-w-7xl flex-col">
        <DialogHeader>
          <DialogTitle>
            Curation Report: {activity?.metadata?.playlistName || 'Playlist'}
          </DialogTitle>
          <DialogDescription>
            Changes from {activity?.metadata?.dryRun ? 'test' : 'automation'} run at{' '}
            {activity && new Date(activity.timestamp).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="h-full min-h-0 flex-1 overflow-y-auto py-4 pr-1 md:overflow-hidden">
          {activity?.metadata?.diff ? (
            <div className="flex h-full flex-col">
              <DiffViewer diff={activity.metadata.diff} isDryRun={activity.metadata.dryRun} />
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
              <History className="mb-2 h-10 w-10 opacity-50" />
              <p>No details available for this run.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-4 sm:flex-row">
          {activity?.metadata?.diff?.stats && (
            <div className="text-muted-foreground flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium">
              <span>
                Target:{' '}
                <span className="text-foreground">{activity.metadata.diff.stats.target}</span>
              </span>
              <span className="text-lg leading-none opacity-20">|</span>
              <span>
                Final: <span className="text-foreground">{activity.metadata.diff.stats.final}</span>
              </span>
              <span className="text-lg leading-none opacity-20">|</span>
              <span className="flex items-center gap-1.5">
                Success:
                {activity.metadata.diff.stats.success ? (
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
          <Button className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
