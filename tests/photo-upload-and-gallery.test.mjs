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
  assert.doesNotMatch(recordActionsSource, /compressed_path:\s*uploadResult\.compressedPath/);
  assert.match(recordActionsSource, /insertPhotoMetadata/);
});

test('record uploads tolerate an old photos table that still requires compressed_path', async () => {
  const recordActionsSource = await readFile(
    path.join(rootDir, 'src/app/(dashboard)/records/actions.ts'),
    'utf8'
  );

  assert.match(recordActionsSource, /isMissingLegacyCompressedPath/);
  assert.match(recordActionsSource, /compressed_path:\s*photoData\.storage_path/);
  assert.doesNotMatch(recordActionsSource, /storage\.upload\([^)]*compressed/);
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

test('record edit page passes existing signed photos into the form', async () => {
  const editPageSource = await readFile(
    path.join(rootDir, 'src/app/(dashboard)/records/[id]/edit/page.tsx'),
    'utf8'
  );
  const recordFormSource = await readFile(
    path.join(rootDir, 'src/components/records/RecordForm.tsx'),
    'utf8'
  );

  assert.match(editPageSource, /photos\s*\(/);
  assert.match(editPageSource, /getStorageProvider/);
  assert.match(editPageSource, /getSignedUrls/);
  assert.match(editPageSource, /initialPhotos=\{photosWithUrls\}/);
  assert.match(recordFormSource, /initialPhotos/);
  assert.match(recordFormSource, /existingPhotos\.map/);
  assert.match(recordFormSource, /deletePhoto\(photoId\)/);
});

test('photo schema and dependencies no longer require persisted compressed image copies', async () => {
  const schemaSource = await readFile(
    path.join(rootDir, 'supabase/migrations/000_schema.sql'),
    'utf8'
  );
  const packageSource = await readFile(path.join(rootDir, 'package.json'), 'utf8');
  const storageTypesSource = await readFile(
    path.join(rootDir, 'src/lib/storage/types.ts'),
    'utf8'
  );

  assert.doesNotMatch(schemaSource, /\bcompressed_path\b/);
  assert.doesNotMatch(schemaSource, /\bcompressed_size\b/);
  assert.doesNotMatch(schemaSource, /\bthumbnail_path\b/);
  assert.doesNotMatch(packageSource, /browser-image-compression/);
  assert.doesNotMatch(storageTypesSource, /compressedFile|compressedPath|compressedUrl/);
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

test('dashboard quote fetches through a same-origin route instead of a browser-side external request', async () => {
  const dailyQuoteSource = await readFile(
    path.join(rootDir, 'src/components/dashboard/DailyQuote.tsx'),
    'utf8'
  );
  const quoteRouteSource = await readFile(
    path.join(rootDir, 'src/app/api/quote/route.ts'),
    'utf8'
  );

  assert.match(dailyQuoteSource, /fetch\(quoteEndpoint/);
  assert.doesNotMatch(dailyQuoteSource, /https:\/\/v1\.hitokoto\.cn/);
  assert.match(quoteRouteSource, /https:\/\/v1\.hitokoto\.cn\/\?c=d&c=i&c=k/);
});
