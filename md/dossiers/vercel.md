# vercel

#### Einzelne Regeln mit optionalem Slash

```json
{
  "rewrites": [
    // Matches both /apps and /apps/
    {
      "source": "/apps/?",
      "destination": "/index.html?kind=apps"
    },
    // Matches both /tools and /tools/
    {
      "source": "/tools/?",
      "destination": "/index.html?kind=tools"
    }
  ]
}
```

oder zusammengefasst

```json
{
  "rewrites": [
    // Matches /apps, /apps/, /tools, and /tools/ in a single rule
    {
      "source": "/:kind(apps|tools)/?",
      "destination": "/index.html?kind=:kind"
    }
  ]
}
```
