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

```json
{
  "rewrites": [
    {
      "source": "/",
      "has": [
        {
          "type": "host",
          "value": "(?<appname>(?!www)[^.]+)\\.zugriff\\.dev"
        }
      ],
      "destination": "/apps/:appname/index.html"
    },
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "(?<appname>(?!www)[^.]+)\\.zugriff\\.dev"
        }
      ],
      "destination": "/apps/:appname/:path*"
    },
    {
      "source"      : "/:kind(apps2|tools2)(/)?",
      "destination" : "/index.html?kind=:kind"
    },
    {
      "source"      : "/:kind(apps|tools)(/)?",
      "destination" : "/:kind.html"
    },
    {
      "source"      :      "/:appname/",
      "destination" : "/apps/:appname/index.html"
    },
    {
      "source"      :      "/:appname",
      "destination" : "/apps/:appname/index.html"
    },
    {
      "source"      :      "/:appname/:path*",
      "destination" : "/apps/:appname/:path*"
    }
  ]
}
```
