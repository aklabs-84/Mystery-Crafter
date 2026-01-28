
import { VisualStyle, GameData } from './types';
import { Language } from './translations';

export const BLANK_GAME: GameData = {
  id: 'new-case-' + Date.now(),
  title: { KO: '제목 없는 사건', EN: 'Untitled Case' },
  visualStyle: VisualStyle.LIGNE_CLAIRE,
  startSceneId: '',
  scenes: {},
  items: {},
  npcs: {},
  initialFlags: {},
  conclusion: {
    mysterySolution: { KO: '', EN: '' },
    successTitle: { KO: '사건 해결', EN: 'Case Solved' },
    successBody: { KO: '진실을 밝혀냈습니다.', EN: 'You revealed the hidden truth.' },
    failureTitle: { KO: '게임 오버', EN: 'Game Over' },
    failureBody: { KO: '진실은 영원히 묻혔습니다.', EN: 'The truth remains buried.' }
  }
};

export const getInitialGame = (lang: Language): GameData => {
  return { ...BLANK_GAME };
};

export const STYLE_PRESETS: Record<VisualStyle, string> = {
  [VisualStyle.FILM_NOIR]: "Style: Film noir, high contrast lighting, chiaroscuro, muted colors or black and white, detective movie atmosphere, dramatic shadows, noir mystery aesthetic.",
  [VisualStyle.NEO_NOIR]: "Style: Neo-noir cyberpunk, neon lighting, dark rainy city, high contrast, futuristic detective atmosphere, saturated colors, sharp shadows.",
  [VisualStyle.WATERCOLOR]: "Style: Urban sketching style, ink lines and watercolor, loose brushstrokes, sketchbook texture, visible pencil lines, hand-painted feel, analog mystery report aesthetic.",
  [VisualStyle.DIGITAL_PAINTING]: "Style: Semi-realistic digital painting, painterly brushstrokes, oil painting texture, rich colors, detailed environment, moody atmosphere, sophisticated mystery illustration.",
  [VisualStyle.LIGNE_CLAIRE]: "Style: Ligne Claire, bold clean black outlines, consistent line weight, flat colors, no gradients, clean Belgian comic aesthetic, Herge style, maximum clarity.",
  [VisualStyle.FLAT_VECTOR]: "Style: Flat vector illustration, minimalist design, no outlines, geometric shapes, solid colors, modern graphic style, clean digital art, vibrant colors."
};

export const STYLE_METADATA: Record<VisualStyle, { label: string, desc: string, icon: string, preview: string }> = {
  [VisualStyle.FILM_NOIR]: {
    label: '필름 누아르 (Film Noir)',
    desc: '강렬한 명암 대비와 어두운 분위기의 고전 탐정물 스타일',
    icon: '🎬',
    preview: '/images/styles/film_noir.png'
  },
  [VisualStyle.NEO_NOIR]: {
    label: '네오 누아르 사이버펑크',
    desc: '화려한 네온과 어두운 도시가 공존하는 SF 추리 스타일',
    icon: '🌆',
    preview: '/images/styles/neo_noir.png'
  },
  [VisualStyle.WATERCOLOR]: {
    label: '어반 스케치 & 수채화',
    desc: '수첩에 직접 스케치하고 채색한 듯한 현장감 있는 스타일',
    icon: '🎨',
    preview: '/images/styles/watercolor.png'
  },
  [VisualStyle.DIGITAL_PAINTING]: {
    label: '세미 리얼리스틱',
    desc: '진중한 분위기의 회화적인 디지털 페인팅 스타일',
    icon: '🖌️',
    preview: '/images/styles/digital_painting.png'
  },
  [VisualStyle.LIGNE_CLAIRE]: {
    label: '리뉴 클레르 (Ligne Claire)',
    desc: '깨끗한 외곽선과 평면적인 색채의 명확한 스타일',
    icon: '✒️',
    preview: '/images/styles/ligne_claire.png'
  },
  [VisualStyle.FLAT_VECTOR]: {
    label: '플랫 벡터 일러스트',
    desc: '세련되고 직관적인 현대적 그래픽 디자인 스타일',
    icon: '📐',
    preview: '/images/styles/flat_vector.png'
  }
};
