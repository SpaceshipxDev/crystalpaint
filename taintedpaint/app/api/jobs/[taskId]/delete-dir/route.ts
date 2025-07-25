import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sanitizeRelativePath } from '@/lib/pathUtils.mjs'

const TASKS_STORAGE_DIR = path.join(process.cwd(), 'public', 'storage', 'tasks')

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const { taskId } = params
  if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })

  try {
    const { relativePath } = await req.json()
    if (!relativePath) {
      return NextResponse.json({ error: 'relativePath required' }, { status: 400 })
    }
    let safeRel
    try {
      safeRel = sanitizeRelativePath(relativePath)
    } catch {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const dirPath = path.join(TASKS_STORAGE_DIR, taskId, safeRel)
    try {
      await fs.rmdir(dirPath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('delete-dir error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
