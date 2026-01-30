/**
 * Audio file URL generation utility
 *
 * Audio files are stored in Cloud Storage at:
 * - Chapter-level: audio/{bookId}/{sectionId}/{chapterId}-{lang}.{ext}
 * - Segment-level: audio/{bookId}/{sectionId}/{chapterId}-{segmentIndex}-{lang}.{ext}
 *
 * File extensions:
 * - Chinese (zh): .mp3 (TTS generated)
 * - Japanese (ja): .webm (manually recorded)
 *
 * In development, locally saved files are served from /audio/ directory.
 *
 * Public URL format:
 * https://storage.googleapis.com/{bucketName}/audio/{bookId}/{sectionId}/{chapterId}-{lang}.{ext}
 */

import audioManifest from '../../audio-manifest.json';
import {
  type AudioLanguage,
  type AudioManifest,
  getSegmentAudio,
  isSegmentAudioAvailable,
} from './audio-manifest';

const AUDIO_BUCKET_NAME =
  process.env.NEXT_PUBLIC_AUDIO_BUCKET_NAME || 'pj-7sdv-audio-prd';

const AUDIO_BASE_URL = `https://storage.googleapis.com/${AUDIO_BUCKET_NAME}`;

const isDev = process.env.NODE_ENV === 'development';

export type { AudioLanguage };

/**
 * Generate audio file URL for a content
 *
 * Uses hash from audio-manifest.json as cache busting parameter
 * to ensure browsers fetch the latest version after regeneration.
 *
 * @param bookId - Book ID (e.g., "lunyu")
 * @param sectionId - Section ID (e.g., "1")
 * @param chapterId - Chapter ID (e.g., "1")
 * @param lang - Language code ("zh" for Chinese, "ja" for Japanese)
 * @returns Public URL to the audio file with cache busting parameter
 */
export function getAudioUrl(
  bookId: string,
  sectionId: string,
  chapterId: string,
  lang: AudioLanguage,
): string {
  // Chinese uses mp3 (TTS), Japanese uses webm (manually recorded)
  const ext = lang === 'zh' ? 'mp3' : 'webm';
  const manifest = audioManifest as unknown as AudioManifest;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;
  const entry = manifest[contentId];

  // Chapter-level audio is stored at segment index 0
  const segmentIndex = 0;
  const langEntry = getSegmentAudio(entry, segmentIndex, lang);

  // In development, use local file if only generatedAt exists (not yet uploaded)
  if (isDev && langEntry?.generatedAt && !langEntry?.uploadedAt) {
    const audioPath = `audio/${bookId}/${sectionId}/${chapterId}-${lang}.${ext}`;
    const localUrl = `/api/audio/serve?path=${encodeURIComponent(audioPath)}`;
    return langEntry.hash ? `${localUrl}&v=${langEntry.hash}` : localUrl;
  }

  // Use Cloud Storage URL for uploaded files
  const baseUrl = `${AUDIO_BASE_URL}/audio/${bookId}/${sectionId}/${chapterId}-${lang}.${ext}`;
  const hash = langEntry?.hash;

  if (hash) {
    return `${baseUrl}?v=${hash}`;
  }

  return baseUrl;
}

/**
 * Generate audio file URL for a specific segment
 *
 * Uses hash from audio-manifest.json as cache busting parameter
 * to ensure browsers fetch the latest version after regeneration.
 *
 * @param bookId - Book ID (e.g., "lunyu")
 * @param sectionId - Section ID (e.g., "1")
 * @param chapterId - Chapter ID (e.g., "1")
 * @param segmentIndex - Segment index (0 for chapter-level)
 * @param lang - Language code ("zh" for Chinese, "ja" for Japanese)
 * @returns Public URL to the segment audio file with cache busting parameter
 */
export function getSegmentAudioUrl(
  bookId: string,
  sectionId: string,
  chapterId: string,
  segmentIndex: number,
  lang: AudioLanguage,
): string {
  // Chinese uses mp3 (TTS), Japanese uses webm (manually recorded)
  const ext = lang === 'zh' ? 'mp3' : 'webm';
  const manifest = audioManifest as unknown as AudioManifest;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;
  const entry = manifest[contentId];

  const langEntry = getSegmentAudio(entry, segmentIndex, lang);

  // Construct filename with segment index
  const filename = `${chapterId}-${segmentIndex}-${lang}.${ext}`;

  // In development, use local file if only generatedAt exists (not yet uploaded)
  if (isDev && langEntry?.generatedAt && !langEntry?.uploadedAt) {
    const audioPath = `audio/${bookId}/${sectionId}/${filename}`;
    const localUrl = `/api/audio/serve?path=${encodeURIComponent(audioPath)}`;
    return langEntry.hash ? `${localUrl}&v=${langEntry.hash}` : localUrl;
  }

  // Use Cloud Storage URL for uploaded files
  const baseUrl = `${AUDIO_BASE_URL}/audio/${bookId}/${sectionId}/${filename}`;
  const hash = langEntry?.hash;

  if (hash) {
    return `${baseUrl}?v=${hash}`;
  }

  return baseUrl;
}

/**
 * Check if audio file is available for a content
 *
 * @param contentId - Content ID (e.g., "lunyu/1/1")
 * @param lang - Language code ("zh" for Chinese, "ja" for Japanese)
 * @returns true if audio file is available:
 *   - Production: has uploadedAt (uploaded to Cloud Storage)
 *   - Development: has uploadedAt OR generatedAt (local file exists)
 */
export function isAudioAvailable(
  contentId: string,
  lang: AudioLanguage,
): boolean {
  const manifest = audioManifest as unknown as AudioManifest;
  const entry = manifest[contentId];

  // Chapter-level audio is stored at segment index 0
  const segmentIndex = 0;
  return isSegmentAudioAvailable(entry, segmentIndex, lang, isDev);
}

/**
 * Check if audio file is available for a specific segment
 *
 * @param contentId - Content ID (e.g., "lunyu/1/1")
 * @param segmentIndex - Segment index (0 for chapter-level)
 * @param lang - Language code ("zh" for Chinese, "ja" for Japanese)
 * @returns true if audio file is available:
 *   - Production: has uploadedAt (uploaded to Cloud Storage)
 *   - Development: has uploadedAt OR generatedAt (local file exists)
 */
export function isSegmentAudioAvailableForContent(
  contentId: string,
  segmentIndex: number,
  lang: AudioLanguage,
): boolean {
  const manifest = audioManifest as unknown as AudioManifest;
  const entry = manifest[contentId];
  return isSegmentAudioAvailable(entry, segmentIndex, lang, isDev);
}
