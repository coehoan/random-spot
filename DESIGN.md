# RANDOM / SPOT — Design System

Neo-brutalist design system. 모든 페이지에 공통 적용.

---

## Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
```

| 변수 | 폰트 | 용도 |
|------|------|------|
| `--font-pixel-en` | Press Start 2P | 영문 레이블, 뱃지, 메타 텍스트, brand-mark, 버튼 내 영문 |
| `--font-title` | Pretendard Variable Bold | 한글 제목 (h1, h2, 카드 타이틀) |
| `--font-pixel-ko` | Galmuri11 | 한글 본문, 버튼, 칩, 결과 텍스트, 푸터 |

- Press Start 2P는 픽셀 폰트 특성상 **font-weight: normal** 고정, 크기는 8–10px 사용
- Galmuri11도 **font-weight: normal** 고정 (bold 시 픽셀 뭉개짐)
- Pretendard는 font-weight: 700 사용

---

## Color Tokens

```css
--paper:   #f0eee7   /* 배경 (웜 오프화이트) */
--paper-2: #e5e2d7   /* 보조 배경, hover 상태 */
--ink-1:   #111111   /* 주 텍스트, 테두리 */
--ink-2:   #333333   /* 보조 텍스트 */
--ink-3:   #6a6a66   /* 비활성 텍스트, 플레이스홀더 */
--yellow:  #ffed3a   /* 포인트 컬러 (강조, active 상태, 결과 버블) */
--red:     #e7372f   /* 에러 상태 */
--blue:    #2d5df2   /* 정보 강조 */
--green:   #1fb25a   /* 성공 상태 */
```

메인 페이지(`index.html`)는 별도 인라인 스타일 사용. 폰트 변수명은 동일하게 통일됨. 컬러 값은 일부 차이 있음 (`--yellow: #fde047`, `--ink-1: #000000`).

---

## Border & Shadow

```css
--border:         2.5px solid var(--ink-1)   /* 기본 테두리 */
--border-thin:    1.5px solid var(--ink-1)   /* 얇은 테두리 (칩, 체크박스) */
--shadow-hard:    6px 6px 0 var(--ink-1)     /* 하드 그림자 (카드, 버튼, 버블) */
--shadow-hard-sm: 4px 4px 0 var(--ink-1)     /* 작은 하드 그림자 (hover 상태) */
```

소프트 그림자 없음. 모든 그림자는 offset만 있는 hard shadow.

---

## Grid Background

모든 페이지 배경에 격자 패턴 적용.

```css
/* 서브 페이지 (_shared.css) */
body::before {
  content: "";
  position: fixed; inset: 0;
  background-image:
    linear-gradient(to right, rgba(17,17,17,.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(17,17,17,.04) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}

/* 메인 페이지 (index.html) */
background-image:
  linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px);
background-size: 32px 32px;
```

---

## Layout

```css
.shell {
  max-width: 920px;      /* 서브 페이지 */
  /* max-width: 1200px; 메인 페이지 */
  margin: 0 auto;
  padding: 20px 20px 40px;
  display: flex; flex-direction: column;
  min-height: 100vh;
  position: relative; z-index: 1;
}
```

---

## Components

### Topbar

로고(Brand Mark) + 뒤로가기 버튼 구조.

```html
<header class="topbar">
  <a class="brand" href="../index.html">
    <span class="brand-mark">R</span>
    <span class="brand-name">RANDOM / SPOT</span>
  </a>
  <a id="goMainBtn" class="go-main" href="../index.html">
    <span>←</span> 메인으로
  </a>
</header>
```

- `brand-mark`: 42×42 블랙 박스에 yellow `R` 문자
- `go-main`: hover 시 yellow 배경 + 2px 위/왼쪽 이동 + shadow

### Hero

각 페이지 상단 타이틀 영역.

```html
<section class="hero">
  <div class="hero-meta">
    <span class="no">N° 01</span>   <!-- 블랙 배경, yellow 텍스트 -->
    <span class="cat">// REGION</span>
  </div>
  <h1>랜덤 <span class="mark">여행지역</span></h1>
  <p>설명 텍스트</p>
</section>
```

- `h1`: `clamp(36px, 5.5vw, 58px)`, uppercase, letter-spacing -0.035em
- `.mark`: yellow 배경 하이라이트, `box-decoration-break: clone`
- `hero-meta .no`: font-mono, 블랙 배경, yellow 텍스트

페이지별 번호:
- `N° 01` REGION
- `N° 02` VEHICLE
- `N° 03` SUBWAY
- `N° 04` RESTAURANT
- `N° 05` CHALLENGE

### How-to Box

사용 방법 안내 박스. `::before`로 플로팅 레이블.

```html
<section class="howto">
  <h2>사용 방법</h2>
  <p>설명</p>
  <ul>
    <li>항목 (▸ 불릿 자동 적용)</li>
  </ul>
  <p class="muted">※ 주의사항</p>
</section>
```

- 테두리 상단에 `// HOW TO USE` 레이블 (font-mono, 블랙 배경에서 pop-out)
- `.muted`: font-mono, ink-3, border-top 구분선

### Primary Button

```html
<button id="startBtn" class="btn-primary">시작하기 →</button>
```

- 블랙 배경, yellow 텍스트, full width
- hard shadow (`6px 6px`), hover 시 `-2px -2px` 이동 + 그림자 확대
- active 시 `+3px +3px` 이동 + 그림자 축소

### Secondary Button

```html
<button class="secondary-btn">
  <span class="icon">🖼️</span> 이미지로 저장
</button>
```

- paper 배경, 블랙 테두리
- hover 시 yellow 배경 + `-1px -1px` 이동 + small shadow

### Result Bubble

랜덤 결과 표시 영역.

```html
<div id="bubbleWrap" class="bubble-wrap dis-none">
  <div id="bubble" class="bubble"></div>
</div>
```

- yellow 배경, hard shadow
- `::before`로 `/* RESULT */` 레이블 (블랙 배경, yellow 텍스트)
- 초기: `opacity: 0; transform: scale(.95)` → `.show` 시 `opacity: 1; scale(1)`
- 애니메이션: `cubic-bezier(.34,1.56,.64,1)` (spring bounce)
- 내부 `<strong>`: `clamp(30px, 5vw, 50px)`, display block
- 내부 `<small>`: font-mono, 12px, ink-1

### Actions (save/share)

```html
<div class="actions" id="actions">
  <button id="saveImgBtn" class="secondary-btn">
    <span class="icon">🖼️</span> 이미지로 저장
  </button>
  <button id="shareBtn" class="secondary-btn">
    <span class="icon">🔗</span> 결과 공유하기
  </button>
</div>
```

- 초기 `display: none`, 결과 생성 후 `display: flex`
- 각 버튼 `flex: 1; min-width: 200px`

### Accordion Filter

지역/호선 등 다중 선택 필터에 사용.

```html
<button class="accordion-btn" id="toggleBtn">
  <span class="accordion-left">
    <span class="accordion-title">지역 선택</span>
    <span class="badge" id="selectedCount">전체</span>
  </span>
  <span class="accordion-right">
    <span class="arrow" id="toggleArrow">▼</span>
  </span>
</button>
<div class="accordion-panel" id="panel" style="display:none">
  <div class="chips" id="chips"></div>
  <div class="mini-actions" id="actions">
    <button id="selectAllBtn" class="secondary-btn">전체 선택</button>
    <button id="clearAllBtn" class="secondary-btn">전체 해제</button>
  </div>
</div>
```

- `badge`: 블랙 배경, yellow 텍스트, font-mono
- `chip.active`: 블랙 배경, yellow 텍스트
- 아코디언 열릴 때 arrow `▼` → `▲`

### Checkbox Filter Row

단일 ON/OFF 필터.

```html
<div class="filter-row">
  <input type="checkbox" id="myCheckbox" />
  <div class="filter-row-text">
    <div class="filter-row-title">필터 제목</div>
    <div class="filter-row-desc">설명 텍스트</div>
  </div>
</div>
```

- 커스텀 체크박스: 22×22, 체크 시 블랙 배경 + yellow `✓`

### Map Panel

지도 표시 패널.

```html
<div class="sample-map-panel" id="mapPanel" style="display:none">
  <p class="sample-map-status" id="mapStatus">지도를 불러오는 중...</p>
  <div class="sample-map-canvas" id="resultMap"></div>
</div>
```

- `::before`로 `// MAP` 레이블
- `.sample-map-canvas`: height 320px (모바일 240px), paper-2 배경
- `.sample-map-status.is-error`: red 텍스트

### Toast

클립보드 복사 등 알림.

```html
<div id="toast" class="toast"></div>
```

- 화면 상단 중앙 고정
- 블랙 배경, yellow 텍스트, hard shadow
- spring 애니메이션으로 슬라이드 인

### Footer

```html
<footer class="page-footer">
  <div class="links">
    <a href="../static/html/about.html">소개</a>
    <a href="../static/html/contact.html">문의</a>
    <a href="../static/html/terms.html">이용약관</a>
    <a href="../static/html/privacy.html">개인정보처리방침</a>
  </div>
  <div>© 2025 · RANDOM/SPOT · v1.0</div>
</footer>
```

- `margin-top: auto`로 페이지 하단 고정
- font-mono, uppercase, ink-3

---

## Shared CSS

서브 페이지는 모두 `pages/_shared.css`를 import.

```html
<link rel="stylesheet" href="_shared.css" />
```

메인 페이지(`index.html`)는 독립적인 인라인 `<style>` 블록 사용.

---

## Responsive

브레이크포인트: `640px`

```css
@media (max-width: 640px) {
  .shell { padding: 14px 16px 28px; }
  .hero { padding-bottom: 18px; margin-bottom: 20px; }
  .howto { padding: 18px 20px; }
  .sample-map-canvas { height: 240px; }
  .actions .secondary-btn { flex: 1 1 100%; }
  .btn-primary { padding: 16px; font-size: 16px; }
  .bubble { padding: 24px 20px; }
}
```

---

## Animation Patterns

| 상황 | 값 |
|------|-----|
| 버튼 hover/active | `transform .08s ease` |
| 결과 버블 표시 | `cubic-bezier(.34,1.56,.64,1)` (spring) |
| 토스트 표시 | `cubic-bezier(.34,1.56,.64,1)` (spring) |
| hover 이동 (primary) | `-2px -2px` |
| hover 이동 (secondary/go-main) | `-1px -1px` |
| active 이동 (primary) | `+3px +3px` |
| active 이동 (secondary) | `+1px +1px` |

---

## Design Principles

- **Hard edges only**: 모든 시각 요소는 직각. `border-radius` 없음.
- **Black ink system**: 테두리, 그림자, 텍스트 모두 `#111111` 단일 컬러.
- **Yellow as accent**: 포인트는 yellow 하나. 버튼 active, 결과 버블, 뱃지, 레이블.
- **Monospace labels**: 메타 정보, 레이블, 뱃지는 모두 font-mono + uppercase.
- **Grid paper**: 배경 격자는 매우 연하게 (4-5% opacity).
- **Spring animation**: 결과 표시 등 중요한 전환에는 bounce 있는 spring easing.
