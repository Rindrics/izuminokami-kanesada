/**
 * Chart theme configuration
 * Unified theme for all visualization libraries (Cytoscape.js, Recharts, etc.)
 * Colors are aligned with Tailwind CSS palette used in the stats page
 */

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

// Person-specific colors (monochrome palette)
// Using different shades of gray to distinguish persons
const personColors: Record<string, string> = {
  kongzi: '#1F2937', // gray-800 (darkest for Confucius)
  zengzi: '#374151', // gray-700
  youzi: '#4B5563', // gray-600
  zixia: '#6B7280', // gray-500
  zigong: '#9CA3AF', // gray-400
  ziqin: '#D1D5DB', // gray-300
  zilu: '#6B7280', // gray-500
  yanyuan: '#4B5563', // gray-600
};

// Concept colors (monochrome - using gray shades)
const conceptColor = '#9CA3AF'; // gray-400

export const chartTheme = {
  colors,
  personColors,
  conceptColor,
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
        return personColors[node.data.id] || colors.primary[500];
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
