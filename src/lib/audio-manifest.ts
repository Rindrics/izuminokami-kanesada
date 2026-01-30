/**
 * Audio manifest types and utilities
 *
 * Provides common types and helper functions for managing audio manifest entries
 * according to ADR-0024 (segment-based audio generation).
 */

export interface AudioFileMetadata {
  generatedAt?: string; // ISO 8601 timestamp - present when generated locally
  uploadedAt?: string; // ISO 8601 timestamp - present after Cloud Storage upload
  hash: string; // SHA-256 hash of the audio file
}

export interface AudioSegment {
  index: number;
  zh?: AudioFileMetadata;
  ja?: AudioFileMetadata;
}

export interface AudioManifestEntry {
  segments: AudioSegment[];
}

// Legacy format for backward compatibility during migration
interface LegacyAudioManifestEntry {
  zh?: AudioFileMetadata;
  ja?: AudioFileMetadata;
}

export type AudioManifest = Record<
  string,
  AudioManifestEntry | LegacyAudioManifestEntry
>;

/**
 * Check if manifest entry is in legacy format (chapter-level without segments array)
 */
function isLegacyEntry(
  entry: AudioManifestEntry | LegacyAudioManifestEntry,
): entry is LegacyAudioManifestEntry {
  return !('segments' in entry);
}

/**
 * Convert legacy entry to new segment-based format
 * Legacy entries are treated as segment index 0 (chapter-level)
 */
function convertLegacyEntry(
  entry: LegacyAudioManifestEntry,
): AudioManifestEntry {
  const segment: AudioSegment = { index: 0 };
  if (entry.zh) segment.zh = entry.zh;
  if (entry.ja) segment.ja = entry.ja;
  return { segments: [segment] };
}

/**
 * Get normalized manifest entry (handles both legacy and new formats)
 */
function getNormalizedEntry(
  entry: AudioManifestEntry | LegacyAudioManifestEntry | undefined,
): AudioManifestEntry | undefined {
  if (!entry) return undefined;
  if (isLegacyEntry(entry)) {
    return convertLegacyEntry(entry);
  }
  return entry;
}

export type AudioLanguage = 'zh' | 'ja';

/**
 * Get audio metadata for a specific segment
 *
 * @param entry - Audio manifest entry (supports both legacy and new formats)
 * @param segmentIndex - Segment index (default: 0 for chapter-level)
 * @param lang - Language code
 * @returns Audio metadata if exists, undefined otherwise
 */
export function getSegmentAudio(
  entry: AudioManifestEntry | LegacyAudioManifestEntry | undefined,
  segmentIndex: number,
  lang: AudioLanguage,
): AudioFileMetadata | undefined {
  const normalized = getNormalizedEntry(entry);
  if (!normalized) {
    return undefined;
  }
  const segment = normalized.segments.find((s) => s.index === segmentIndex);
  return segment?.[lang];
}

/**
 * Update or add audio metadata for a specific segment
 *
 * @param entry - Existing manifest entry (or undefined for new entry, supports both legacy and new formats)
 * @param segmentIndex - Segment index
 * @param lang - Language code
 * @param metadata - Audio file metadata
 * @returns Updated manifest entry (always in new format)
 */
export function updateSegmentAudio(
  entry: AudioManifestEntry | LegacyAudioManifestEntry | undefined,
  segmentIndex: number,
  lang: AudioLanguage,
  metadata: AudioFileMetadata,
): AudioManifestEntry {
  const normalized = getNormalizedEntry(entry);
  const existingSegments = normalized?.segments || [];
  const existingSegment = existingSegments.find(
    (s) => s.index === segmentIndex,
  );

  // Create updated segment preserving other language data
  const updatedSegment: AudioSegment = {
    index: segmentIndex,
    ...(existingSegment?.zh && lang !== 'zh' && { zh: existingSegment.zh }),
    ...(existingSegment?.ja && lang !== 'ja' && { ja: existingSegment.ja }),
    [lang]: metadata,
  };

  // Replace or add segment
  const updatedSegments = existingSegments.filter(
    (s) => s.index !== segmentIndex,
  );
  updatedSegments.push(updatedSegment);
  updatedSegments.sort((a, b) => a.index - b.index);

  return {
    segments: updatedSegments,
  };
}

/**
 * Check if audio is available for a segment
 *
 * @param entry - Audio manifest entry (supports both legacy and new formats)
 * @param segmentIndex - Segment index (default: 0 for chapter-level)
 * @param lang - Language code
 * @param isDev - Whether in development mode (local files are also available)
 * @returns true if audio is available
 */
export function isSegmentAudioAvailable(
  entry: AudioManifestEntry | LegacyAudioManifestEntry | undefined,
  segmentIndex: number,
  lang: AudioLanguage,
  isDev: boolean = false,
): boolean {
  const metadata = getSegmentAudio(entry, segmentIndex, lang);
  if (!metadata) {
    return false;
  }

  // In development, local files (generatedAt) are also available
  if (isDev && metadata.generatedAt) {
    return true;
  }

  return metadata.uploadedAt !== undefined;
}
