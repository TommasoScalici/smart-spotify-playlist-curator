import { getDocs, writeBatch } from 'firebase/firestore';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { FirestoreService } from '../firestore-service';

interface MockDoc {
  data: () => { deleted?: boolean; message?: string };
  id: string;
  ref: { id: string };
}

describe('FirestoreService: clearAllActivities', () => {
  const mockUid = 'user123';
  let mockBatchUpdate: ReturnType<typeof vi.fn>;
  let mockBatchCommit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBatchUpdate = vi.fn();
    mockBatchCommit = vi.fn().mockResolvedValue(undefined);

    (writeBatch as Mock).mockReturnValue({
      commit: mockBatchCommit,
      update: mockBatchUpdate
    });
  });

  it('paginates through multiple chunks of 500 documents until all are marked deleted', async () => {
    // Generate first batch of 500 docs
    const batch1Docs = Array.from({ length: 500 }, (_, i) => ({
      data: () => ({ deleted: false, message: `log ${i}` }),
      id: `doc_${i}`,
      ref: { id: `doc_${i}` }
    }));

    // Generate second batch of 100 docs
    const batch2Docs = Array.from({ length: 100 }, (_, i) => ({
      data: () => ({ deleted: false, message: `log ${500 + i}` }),
      id: `doc_${500 + i}`,
      ref: { id: `doc_${500 + i}` }
    }));

    (getDocs as Mock)
      .mockResolvedValueOnce({
        docs: batch1Docs,
        empty: false,
        forEach: (fn: (doc: MockDoc) => void) => batch1Docs.forEach(fn),
        size: 500
      })
      .mockResolvedValueOnce({
        docs: batch2Docs,
        empty: false,
        forEach: (fn: (doc: MockDoc) => void) => batch2Docs.forEach(fn),
        size: 100
      });

    await FirestoreService.clearAllActivities(mockUid);

    expect(getDocs).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(600);
  });

  it('skips already deleted documents and does not commit empty batch', async () => {
    const alreadyDeletedDocs = [
      { data: () => ({ deleted: true }), id: 'doc_1', ref: { id: 'doc_1' } },
      { data: () => ({ deleted: true }), id: 'doc_2', ref: { id: 'doc_2' } }
    ];

    (getDocs as Mock).mockResolvedValueOnce({
      docs: alreadyDeletedDocs,
      empty: false,
      forEach: (fn: (doc: MockDoc) => void) => alreadyDeletedDocs.forEach(fn),
      size: 2
    });

    await FirestoreService.clearAllActivities(mockUid);

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
