import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(import.meta.dirname, '..');

async function importTypeScriptModule(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = await readFile(absolutePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const tempDir = await mkdtemp(path.join(tmpdir(), 'aeon-test-'));
  const tempFile = path.join(tempDir, `${path.basename(relativePath, '.ts')}.mjs`);
  await writeFile(tempFile, transpiled, 'utf8');
  return import(`${pathToFileURL(tempFile).href}?t=${Date.now()}`);
}

test('upload files are renamed with an extension matching their MIME type', async () => {
  const { buildImageFileName, withImageFileName } = await importTypeScriptModule(
    'src/lib/utils/image-files.ts'
  );

  const webpFile = new File(['image-bytes'], '', { type: 'image/webp' });
  const pngFile = new File(['image-bytes'], 'camera.png', { type: 'image/png' });

  assert.equal(buildImageFileName('camera.JPG', webpFile.type), 'camera.webp');
  assert.equal(buildImageFileName('camera.JPG', pngFile.type), 'camera.png');

  const renamed = withImageFileName(webpFile, 'camera.webp');
  assert.equal(renamed.name, 'camera.webp');
  assert.equal(renamed.type, 'image/webp');
});

test('record uploads no longer compress or send a second image copy', async () => {
  const recordFormSource = await readFile(
    path.join(rootDir, 'src/components/records/RecordForm.tsx'),
    'utf8'
  );
  const recordActionsSource = await readFile(
    path.join(rootDir, 'src/app/(dashboard)/records/actions.ts'),
    'utf8'
  );

  assert.doesNotMatch(recordFormSource, /compressImagesInParallel|compressedFile|compressedUploadFile/);
  assert.doesNotMatch(recordActionsSource, /formData\.get\(['"`]compressedFile['"`]\)/);
  assert.doesNotMatch(recordActionsSource, /compressed_size:\s*compressedFile\.size/);
  assert.match(recordActionsSource, /compressed_path:\s*null/);
});

test('timeline and detail reads use the configured storage provider instead of Supabase Storage directly', async () => {
  const files = [
    'src/app/(dashboard)/timeline/page.tsx',
    'src/app/(dashboard)/timeline/actions.ts',
    'src/app/(dashboard)/records/[id]/page.tsx',
    'src/app/(dashboard)/calendar/actions.ts',
    'src/app/(dashboard)/settings/actions.ts',
  ];

  for (const file of files) {
    const source = await readFile(path.join(rootDir, file), 'utf8');
    assert.doesNotMatch(source, /\.from\(['"`]record-photos['"`]\)\s*\.\s*createSignedUrl/);
    assert.doesNotMatch(source, /\.from\(['"`]record-photos['"`]\)\s*\.\s*createSignedUrls/);
  }
});

test('gallery query does not use PostgREST dot-qualified order syntax', async () => {
  const source = await readFile(
    path.join(rootDir, 'src/lib/db/queries/gallery.ts'),
    'utf8'
  );

  assert.doesNotMatch(source, /\.order\(['"`]records\.record_date['"`]/);
  assert.match(source, /referencedTable:\s*['"`]records['"`]/);
});

test('content security policy allows the configured MinIO public origin', async () => {
  process.env.NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT = 'localhost';
  process.env.NEXT_PUBLIC_MINIO_PUBLIC_PORT = '9000';
  process.env.NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL = 'false';

  const { createSecurityHeaders } = await importTypeScriptModule(
    'src/lib/config/security-headers.ts'
  );
  const csp = createSecurityHeaders().find(
    (header) => header.key === 'Content-Security-Policy'
  )?.value;

  assert.match(csp, /img-src[^;]*http:\/\/localhost:9000/);
  assert.match(csp, /connect-src[^;]*http:\/\/localhost:9000/);
  assert.match(csp, /media-src[^;]*http:\/\/localhost:9000/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});
