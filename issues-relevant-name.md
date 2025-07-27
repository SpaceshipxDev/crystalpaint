# Zip File Locked During Initial Download

## Architecture Overview
- **taintedpaint** stores uploaded tasks under `public/storage/tasks/<taskId>` and metadata in `public/storage/metadata.json`.
- **blackpaint (Estara)** downloads a job's files to `C:\EstaraSync/<Folder>` on Windows (or `~/Desktop/Estara 数据/<Folder>` on other systems) and then starts `startBidirectionalSync` from `blackpaint/src/sync.ts`.

## What Happened
Opening a newly uploaded job failed on one client with:

```
下载失败: Error invoking remote method 'download-and-open-task-folder':
Error: EBUSY: resource busy or locked, open 'C:\EstaraSync\仟玺海曙威数控技术有限公司·壹订单·1753446674617自清洁1主板支架ZF29.zip'
```

The folder appeared in `EstaraSync` and could be opened manually. Other machines downloaded the same job successfully. Restarting Estara did not resolve the error.

## Root Cause
`download-and-open-task-folder` streams each file directly to disk. If a background process (for example a virus scanner) briefly locks a file path, `createWriteStream` throws `EBUSY` and the whole download aborts.

## Fix
`blackpaint/src/index.ts` now retries downloads when an `EBUSY` error occurs. The helper waits half a second and tries up to three times before failing.

```ts
async function downloadWithRetry(url: string, dest: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axios.get(url, { responseType: 'stream', timeout: 0 });
      await new Promise<void>((resolve, reject) => {
        const writer = createWriteStream(dest);
        response.data.pipe(writer);
        response.data.on('error', reject);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return;
    } catch (err: any) {
      if (err.code === 'EBUSY' && i < attempts - 1) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
}
```

This prevents transient file locks from causing the initial download to fail.
