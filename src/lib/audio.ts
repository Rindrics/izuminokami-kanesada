/**
 * Audio file URL generation utility
 *
 * Audio files are stored in Cloud Storage at:
 * - Chinese (zh): audio/{bookId}/{sectionId}/{chapterId}-zh.mp3 (TTS generated)
 * - Japanese (ja): audio/{bookId}/{sectionId}/{chapterId}-ja.webm (manually recorded)
 *
 * Public URL format:
 * https://storage.googleapis.com/{bucketName}/audio/{bookId}/{sectionId}/{chapterId}-{lang}.{ext}
 */

import audioManifest from '../../audio-manifest.json';

const AUDIO_BUCKET_NAME =
  process.env.NEXT_PUBLIC_AUDIO_BUCKET_NAME || 'pj-7sdv-audio-prd';

const AUDIO_BASE_URL = `https://storage.googleapis.com/${AUDIO_BUCKET_NAME}`;

export type AudioLanguage = 'zh' | 'ja';

interface AudioFileMetadata {
  generatedAt?: string;
  uploadedAt?: string;
  hash: string;
}

interface AudioManifestEntry {
  zh: AudioFileMetadata;
  ja: AudioFileMetadata;
}

type AudioManifest = Record<string, AudioManifestEntry>;

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
  const baseUrl = `${AUDIO_BASE_URL}/audio/${bookId}/${sectionId}/${chapterId}-${lang}.${ext}`;

  // Add hash as cache busting parameter
  const manifest = audioManifest as AudioManifest;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;
  const entry = manifest[contentId];
  const hash = entry?.[lang]?.hash;

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
 * @returns true if audio file is uploaded (has uploadedAt), false otherwise
 */
export function isAudioAvailable(
  contentId: string,
  lang: AudioLanguage,
): boolean {
  const manifest = audioManifest as AudioManifest;
  const entry = manifest[contentId];
  if (!entry) {
    return false;
  }
  const langEntry = entry[lang];
  return langEntry?.uploadedAt !== undefined;
}
