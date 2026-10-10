<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FOUC-Free Static Page</title>

  <!-- 1. Define base CSS variable fallback -->
  <style>
    :root {
      background-color: var(--theme, #111827);
      color: #f3f4f6;
    }
  </style>

  <!-- 2. Blocking synchronous script placed BEFORE any body rendering -->
  <script>
    (function() {
      try {
        // Read stored state synchronously before DOM render
        const rawState = localStorage.getItem('my_app_state');
        const state = rawState ? JSON.parse(rawState) : {};

        // Fallback to system dark mode if no theme was set
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = state.theme || (prefersDark ? '#111827' : '#ffffff');

        // Instantly apply state to root element
        document.documentElement.style.setProperty('--theme', theme);
        if (state.compact === 'true') {
          document.documentElement.dataset.compact = 'true';
        }
      } catch (e) {
        // Storage access blocked or unavailable
      }
    })();
  </script>
</head>
<body>
  <h1>Static Host without FOUC!</h1>
</body>
</html>
