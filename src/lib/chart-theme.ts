/**
 * Chart theme configuration
 * Unified theme for all visualization libraries (Cytoscape.js, Recharts, etc.)
 * Colors are aligned with Tailwind CSS palette used in the stats page
 */

import { KEY_CONCEPTS } from '@/data/key-concepts';

// Tailwind color values (hex)
const colors = {
  // Primary colors (blue scale)
  primary: {
    200: '#BFDBFE', // blue-200
    400: '#60A5FA', // blue-400
    500: '#3B82F6', // blue-500
    600: '#2563EB', // blue-600
    700: '#1D4ED8', // blue-700
    900: '#1E3A8A', // blue-900
  },
  // Neutral colors (zinc scale)
  neutral: {
    50: '#FAFAFA', // zinc-50
    100: '#F4F4F5', // zinc-100
    200: '#E4E4E7', // zinc-200
    500: '#71717A', // zinc-500
    600: '#52525B', // zinc-600
    700: '#3F3F46', // zinc-700
    800: '#27272A', // zinc-800
    900: '#18181B', // zinc-900
  },
  // Semantic colors
  background: {
    light: '#FAFAFA', // zinc-50
    dark: '#000000', // black
  },
  surface: {
    light: '#FFFFFF', // white
    dark: '#18181B', // zinc-900
  },
  text: {
    primary: {
      light: '#000000', // black
      dark: '#FFFFFF', // white
    },
    secondary: {
      light: '#71717A', // zinc-500
      dark: '#A1A1AA', // zinc-400
    },
  },
  border: {
    light: '#E4E4E7', // zinc-200
    dark: '#3F3F46', // zinc-700
  },
} as const;

// Person node color (unified monochrome)
const personColor = '#52525B'; // zinc-600

// Concept colors (monochrome - using gray shades)
const conceptColor = '#9CA3AF'; // gray-400

/**
 * Generate color for a concept using HSL color space
 * This ensures visually distinct colors for different concepts
 */
function generateConceptColor(_concept: string, index: number): string {
  // Use HSL color space for better color distribution
  // Hue: distribute evenly across 360 degrees
  // Saturation: 60-80% for vibrant but not overwhelming colors
  // Lightness: 40-50% for good contrast on white backgrounds
  const hue = (index * 137.508) % 360; // Golden angle for better distribution
  const saturation = 65 + (index % 3) * 5; // 65-75%
  const lightness = 45 + (index % 2) * 3; // 45-48%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get color for a book
 * Uses the base color from the palette
 */
function getBookColor(bookId: string): string {
  const palette = getBookColorPalette(bookId);
  return palette.base;
}

/**
 * Get color palette for a book (base, light, lighter variants)
 * Used for hierarchical visualizations like VoronoiTreemap
 */
function getBookColorPalette(bookId: string): {
  base: string;
  light: string;
  lighter: string;
} {
  const palettes: Record<
    string,
    { base: string; light: string; lighter: string }
  > = {
    lunyu: {
      base: '#1e40af', // blue-800
      light: '#4b6fa8', // blue-500 with slightly lower saturation
      lighter: '#6b8fc4', // blue-400 with slightly lower saturation
    },
    daxue: {
      base: '#166534', // green-700
      light: '#3d8b5f', // green-500 with slightly lower saturation
      lighter: '#5ba87a', // green-400 with slightly lower saturation
    },
    zhongyong: {
      base: '#0891b2', // cyan-600 (cyan/blue, consistent with light)
      light: '#0891b2', // cyan-600 (cyan, distinct from mengzi's orange/amber)
      lighter: '#06b6d4', // cyan-500 (cyan)
    },
    mengzi: {
      base: '#7c2d12', // brown-800 (keep base dark)
      light: '#ca8a04', // yellow-600 (matches person mengzi color)
      lighter: '#eab308', // yellow-500 (yellow)
    },
  };

  return (
    palettes[bookId] || {
      base: colors.neutral[700],
      light: colors.neutral[500],
      lighter: colors.neutral[200],
    }
  );
}

/**
 * Get color for a person
 */
function getPersonColor(personId: string): string {
  const personColors: Record<string, string> = {
    kongzi: '#7c3aed', // violet-600
    zengzi: '#2563eb', // blue-600
    youzi: '#0891b2', // cyan-600
    zigong: '#059669', // emerald-600
    zixia: '#16a34a', // green-600
    mengzi: '#ca8a04', // yellow-600
    lianghui: '#ea580c', // orange-600
    'liang-huiwang': '#ea580c', // alias
  };

  return personColors[personId] || colors.neutral[500];
}

/**
 * Get color for a concept topic
 * Uses predefined colors for important concepts, falls back to generated colors
 */
function getConceptTopicColor(topic: string | undefined): string {
  if (!topic) return colors.neutral[500];

  // Predefined colors for important concepts (for consistency and better UX)
  const predefinedColors: Record<string, string> = {
    仁: '#be123c', // rose-700 - benevolence (most important)
    義: '#0e7490', // cyan-700 - righteousness
    礼: '#6d28d9', // violet-700 - ritual/propriety
    禮: '#6d28d9', // variant
    智: '#047857', // emerald-700 - wisdom
    信: '#b45309', // amber-700 - trustworthiness
    孝: '#b91c1c', // red-700 - filial piety
    悌: '#1d4ed8', // blue-700 - fraternity
    忠: '#7e22ce', // purple-700 - loyalty
    學: '#0f766e', // teal-700 - learning
    道: '#4338ca', // indigo-700 - the Way
    君: '#991b1b', // red-800 - ruler
    君子: '#dc2626', // red-600 - gentleman
    民: '#166534', // green-700 - people
    利: '#a16207', // yellow-700 - profit
    德: '#64748b', // slate-500 - virtue
  };

  if (predefinedColors[topic]) {
    return predefinedColors[topic];
  }

  // Generate color for other concepts based on their index in KEY_CONCEPTS
  const index = KEY_CONCEPTS.indexOf(topic);
  if (index >= 0) {
    return generateConceptColor(topic, index);
  }

  // Fallback for unknown concepts
  return colors.neutral[500];
}

export const chartTheme = {
  colors,
  personColor,
  conceptColor,
  getBookColor,
  getBookColorPalette,
  getPersonColor,
  getConceptTopicColor,
  fonts: {
    family: 'Noto Sans JP, sans-serif',
    size: {
      small: 12,
      medium: 14,
      large: 18,
    },
  },
  styles: {
    nodeSize: 40,
    edgeWidth: {
      min: 1,
      max: 8,
    },
    borderRadius: 4,
  },
  // Cytoscape.js specific styles
  cytoscape: {
    // Node styles
    node: {
      width: 40,
      height: 40,
      shape: 'ellipse',
      backgroundColor: (node: { data: { type: string; id: string } }) => {
        if (node.data.type === 'concept') {
          return conceptColor;
        }
        return personColor;
      },
      borderWidth: 2,
      borderColor: colors.neutral[200],
      label: 'data(label)',
      textValign: 'center',
      textHalign: 'center',
      textColor: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    // Edge styles
    edge: {
      width: (edge: { data: { weight: number } }) => {
        const { min, max } = chartTheme.styles.edgeWidth;
        // Normalize weight to edge width (assuming max weight is around 10)
        const normalizedWeight = Math.min(edge.data.weight || 1, 10);
        return min + (normalizedWeight / 10) * (max - min);
      },
      lineColor: '#000000', // Black edges
      targetArrowColor: '#000000', // Black arrows
      targetArrowShape: 'triangle',
      curveStyle: 'bezier',
      label: 'data(topic)',
      textRotation: 'autorotate',
      textMarginY: -10,
      fontSize: 12,
      textColor: colors.text.secondary.light,
    },
  },
} as const;

export type ChartTheme = typeof chartTheme;
