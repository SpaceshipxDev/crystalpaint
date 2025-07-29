import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { updateBoardData } from '@/lib/boardDataStore';
import { invalidateFilesCache } from '@/lib/filesCache';
import { TASKS_STORAGE_DIR } from '@/lib/storagePaths';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    const taskDir = path.join(TASKS_STORAGE_DIR, taskId);
    await fs.rm(taskDir, { recursive: true, force: true });

    await updateBoardData(async data => {
      delete data.tasks[taskId];
      for (const col of data.columns) {
        const idx = col.taskIds.indexOf(taskId);
        if (idx !== -1) col.taskIds.splice(idx, 1);
      }
    });

    invalidateFilesCache(taskId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete task ${taskId}:`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
