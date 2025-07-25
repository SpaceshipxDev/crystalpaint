// file: api/jobs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { Readable } from "stream";
import Busboy from "busboy";
import path from "path";
import type { BoardData, Task } from "@/types";
import { baseColumns, START_COLUMN_ID } from "@/lib/baseColumns";
import { readBoardData, updateBoardData } from "@/lib/boardDataStore";

// --- Path Definitions ---
const STORAGE_DIR = path.join(process.cwd(), "public", "storage");
const TASKS_STORAGE_DIR = path.join(STORAGE_DIR, "tasks");
const META_FILE = path.join(STORAGE_DIR, "metadata.json");
// ------------------------

// Legacy helper removed in favour of boardDataStore

// GET: Returns the entire board data object (no changes)
export async function GET() {
  const boardData = await readBoardData();
  return NextResponse.json(boardData);
}

// POST: Creates a new job with folder support

export async function POST(req: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const busboy = Busboy({ headers });

    const files: { data: Buffer; }[] = [];
    const filePaths: string[] = [];
    const fields: Record<string, string> = {};

    busboy.on('file', (_name, file) => {
      const chunks: Buffer[] = [];
      file.on('data', (d: Buffer) => chunks.push(d));
      file.on('end', () => {
        files.push({ data: Buffer.concat(chunks) });
      });
    });

    busboy.on('field', (name, val) => {
      if (name === 'filePaths') {
        filePaths.push(val);
      } else {
        fields[name] = val;
      }
    });

    await new Promise<void>((resolve, reject) => {
      busboy.on('finish', resolve);
      busboy.on('error', reject);
      Readable.fromWeb(req.body as any).pipe(busboy);
    });

    const { customerName = '', representative = '', inquiryDate = '', notes = '', folderName = '' } = fields;
    const deliveryDate = '';

    if (
      files.length === 0 ||
      !customerName ||
      !representative ||
      !inquiryDate ||
      !folderName
    ) {
      return NextResponse.json(
        { error: 'Missing required fields or folder' },
        { status: 400 }
      );
    }

    const taskId = Date.now().toString();
    const taskDirectoryPath = path.join(TASKS_STORAGE_DIR, taskId);
    await fs.mkdir(taskDirectoryPath, { recursive: true });

    const rootPrefix = folderName.replace(/[/\\]+$/, '') + '/';

    for (let i = 0; i < files.length; i++) {
      const rawPath = filePaths[i];
      if (!rawPath) continue;
      const relativePath = rawPath.startsWith(rootPrefix)
        ? rawPath.slice(rootPrefix.length)
        : rawPath;
      const safeRelativePath = path
        .normalize(relativePath)
        .replace(/^(\.\.[\/\\])+/, '');
      if (safeRelativePath.includes('..')) continue;
      const destinationPath = path.join(taskDirectoryPath, safeRelativePath);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.writeFile(destinationPath, files[i].data);
    }

    const newTask: Task = {
      id: taskId,
      columnId: START_COLUMN_ID,
      customerName: customerName.trim(),
      representative: representative.trim(),
      inquiryDate: inquiryDate.trim(),
      deliveryDate,
      notes: notes.trim(),
      taskFolderPath: `/storage/tasks/${taskId}`,
      files: [folderName],
    };

    await updateBoardData(async (boardData) => {
      boardData.tasks[taskId] = newTask;
      const startCol = boardData.columns.find((c) => c.id === START_COLUMN_ID);
      if (startCol) {
        startCol.taskIds.push(taskId);
      } else if (boardData.columns[0]) {
        boardData.columns[0].taskIds.push(taskId);
      }
    });

    return NextResponse.json(newTask);
  } catch (err) {
    console.error('Failed to create job:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Updates the entire board state (used for drag & drop, no changes)
export async function PUT(req: NextRequest) {
  try {
    const boardData = (await req.json()) as BoardData;
    if (!boardData.tasks || !boardData.columns) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await updateBoardData(async (data) => {
      data.tasks = boardData.tasks;
      data.columns = boardData.columns;
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update board:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}