# 🔍 Mystery Crafter (미스터리 크래프터)
### AI가 빚어내는 정교한 미스터리와 느와르 스토리텔링의 세계

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://mystery-crafter.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20Gemini-red?style=for-the-badge)](https://github.com/aklabs-84/Mystery-Crafter)

</div>

---

## 🌟 프로젝트 소개

**Mystery Crafter**는 인공지능(AI)을 활용하여 누구나 정교한 미스터리 게임을 설계하고 플레이할 수 있는 차세대 스토리텔링 플랫폼입니다. 느와르적인 분위기와 직관적인 에디터를 통해 단순한 텍스트 기반 게임을 넘어, 단서 탐색과 NPC 취조가 가능한 인터랙티브한 경험을 제공합니다.

## 🚀 주요 기능

### 1. AI 마법사 (AI Wizard)
- 간단한 키워드만으로 복잡한 사건의 개요, 트릭, 범행 동기를 자동으로 설계합니다.
- Google Gemini AI를 활용하여 개연성 있는 시나리오와 캐릭터 설정을 제안받을 수 있습니다.

### 2. 프로페셔널 스튜디오 (Studio)
- AI가 생성한 기초 데이터를 바탕으로 장소(Scene), 인물(NPC), 아이템, 조사 포인트(Hotspot)를 세밀하게 편집합니다.
- 이미지 프롬프트 최적화를 통해 일관된 비주얼 스타일의 사건 현장을 구현합니다.

### 3. 미스터리 갤러리 (Gallery)
- 전 세계 창작자들이 공개한 사건들을 직접 플레이하고 추리할 수 있습니다.
- 사용자들의 플레이 데이터(조회수 등)를 실시간으로 확인할 수 있습니다.

### 4. 고도화된 최적화 (Advanced Optimization)
- **초고속 로딩**: 대용량 데이터를 최적화하고 Lazy Loading 및 WebP 변환을 적용하여 쾌적한 플레이 환경을 제공합니다.
- **반응형 디자인**: 데스크탑부터 모바일까지 완벽한 느와르 UI/UX를 경험할 수 있습니다.

## 🛠 기술 스택

- **Frontend**: React (TypeScript), Vite, Tailwind CSS
- **Backend/DB**: Supabase (Auth, DB, Storage)
- **AI**: Google Gemini API
- **Optimization**: React.lazy, browser-image-compression (WebP)
- **Deployment**: Vercel

## 💻 로컬 시작하기

프로젝트를 로컬 환경에서 실행하려면 아래의 단계를 따르세요.

### 사전 요구사항
- [Node.js](https://nodejs.org/) (최신 LTS 버전 권장)

### 설치 및 실행
1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/aklabs-84/Mystery-Crafter.git
   cd mystery-crafter
   ```
2. 의존성을 설치합니다:
   ```bash
   npm install
   ```
3. 환경 변수를 설정합니다:
   - `.env.local` 파일을 생성하고 Supabase 정보와 Gemini API Key를 입력합니다.
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
4. 개발 서버를 실행합니다:
   ```bash
   npm run dev
   ```

---

## 🏛 저작권 및 크레딧
Created by **AKLABS**. 창의성과 기술의 융합을 연구합니다.

- **Website**: [AKLABS Homepage](https://litt.ly/aklabs)
- **License**: Private / All rights reserved
