# Lab 7 Exercise — Yusong Huang

## Setup
```bash
npm install
npm run dev
```

## Assignments Completed

### Assignment 1: Real-time Clock in LatestNews
- **File:** `src/components/LatestNews.jsx`
- Fetches time from `http://quan.suning.com/getSysTime.do` every second via `setInterval`
- Error handling: falls back to local time with "(local time)" label when API fails
- Uses `useState` + `useEffect` with cleanup on unmount

### Assignment 2: Performance Measurement (3 Components)
- **File:** `src/components/PerformanceMonitor.jsx`
- Wrapper component using `performance.now()` to measure render time
- Applied to 3 components in Home page: ClickDemo, DarkModeToggle, RoutingSection
- Displays render time in a badge and logs to console

### Assignment 3: React.lazy
- **File:** `src/App.jsx`
- `NewsDetail` component is lazy-loaded using `React.lazy(() => import(...))`
- Wrapped in `<Suspense fallback={...}>` with a loading indicator
- NewsDetail only loads when user navigates to `/news/:id`
