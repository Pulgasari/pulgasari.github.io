let code = '';

const definePalette = (key, entry) => {
  return css`
    container style(--palette: ${key})  { 
      --color-bg  : ${entry.bg}; 
      --color-fg  : ${entry.fg}; 
      --color-ink : ${entry.ink};
    }
  `;
}

const palettes = {
  amethyst : { bg: '#160f1f', fg: '#ece0f5', ink: '#a855f7' },
  beton    : { bg: '#3a3a3a', fg: '#dcdcdc', ink: '#9ad1d4' },
};

code += css`
  body {
    --color-bg  : --palette-derived(var(--palette), bg);
    --color-fg  : --palette-derived(var(--palette), fg);
    --color-ink : --palette-derived(var(--palette), ink);

    ${palettes.forEach(definePalette)}

    ${palettes.forEach(([key, entry) => css`
      container style(--palette: ${key})  {
        --color-bg  : ${entry.bg}; 
        --color-fg  : ${entry.fg}; 
        --color-ink : ${entry.ink};
      }
    `)}
  }
`;
/*//////////// DERIVED ////////////*/

/* a color as the palette: the ink itself, background and text from its hue */
@function --palette-derived(
  --color <color>              : royalblue,
  --role  type(bg | fg | ink)  : bg
) returns <color> {
  result: if(
    style(--role: ink) : var(--color);
    style(--role: fg)  : light-dark(oklch(from var(--color) 0.18 calc(c * 0.05) h), oklch(from var(--color) 0.94 calc(c * 0.05) h));
    else               : light-dark(oklch(from var(--color) 0.97 calc(c * 0.15) h), oklch(from var(--color) 0.14 calc(c * 0.25) h));
  );
}

/*//////////// PAGE ////////////*/

body {
  --color-bg  : --palette-derived(var(--palette), bg);
  --color-fg  : --palette-derived(var(--palette), fg);
  --color-ink : --palette-derived(var(--palette), ink);

  @container style(--palette: amethyst)  { --color-bg: #160f1f; --color-fg: #ece0f5; --color-ink: #a855f7; }
  @container style(--palette: beton)     { --color-bg: #3a3a3a; --color-fg: #dcdcdc; --color-ink: #9ad1d4; }
  @container style(--palette: classic)   { --color-bg: #ffffff; --color-fg: #000000; --color-ink: #880088; }
  @container style(--palette: desert)    { --color-bg: #e3cfa4; --color-fg: #3b2c17; --color-ink: #8a3a0f; }
  @container style(--palette: dracula)   { --color-bg: #282a36; --color-fg: #f8f8f2; --color-ink: #ff79c6; }
  @container style(--palette: flamingo)  { --color-bg: #2b1e25; --color-fg: #ffe9f1; --color-ink: #ff5c8a; }
  @container style(--palette: hell)      { --color-bg: #ffffff; --color-fg: #101317; --color-ink: #0a66c2; }
  @container style(--palette: kontrast)  { --color-bg: #000000; --color-fg: #ffffff; --color-ink: #ffff00; }
  @container style(--palette: lavendel)  { --color-bg: #f3f0fa; --color-fg: #241c33; --color-ink: #6b3fd4; }
  @container style(--palette: matrix)    { --color-bg: #0b0f0b; --color-fg: #c8f7c5; --color-ink: #39ff14; }
  @container style(--palette: nightsky)  { --color-bg: #0b1a2e; --color-fg: #dbe4f0; --color-ink: #6ea8fe; }
  @container style(--palette: oled)      { --color-bg: #000000; --color-fg: #e9e9e9; --color-ink: #00e5ff; }
  @container style(--palette: papier)    { --color-bg: #efe9dd; --color-fg: #2b2622; --color-ink: #8f5d3a; }
  @container style(--palette: parrot)    { --color-bg: #10241a; --color-fg: #f3f7e8; --color-ink: #ff4d2d; }
  @container style(--palette: petrol)    { --color-bg: #08191a; --color-fg: #d5eceb; --color-ink: #0fb9ad; }
  @container style(--palette: rubin)     { --color-bg: #1a0a0f; --color-fg: #f2dfe3; --color-ink: #f2295b; }
  @container style(--palette: smaragd)   { --color-bg: #07160f; --color-fg: #dff3e6; --color-ink: #50c878; }
  @container style(--palette: snowflake) { --color-bg: #e9f1f7; --color-fg: #16262f; --color-ink: #00697a; }
  @container style(--palette: softblack) { --color-bg: #151515; --color-fg: #e6e6e6; --color-ink: #ffb86c; }
  @container style(--palette: softwhite) { --color-bg: #f2f2ef; --color-fg: #1c1c1c; --color-ink: #c2255c; }
  @container style(--palette: synthwave) { --color-bg: #241b3a; --color-fg: #ffe9fb; --color-ink: #f92aad; }
  @container style(--palette: tinte)     { --color-bg: #0e0e1a; --color-fg: #dcd9f0; --color-ink: #8b7dff; }
  @container style(--palette: zombie)    { --color-bg: #282a36; --color-fg: #f8f8f2; --color-ink: #ff79c6; }
}

/*//////////// AREA ////////////*/

@function --palette-color(
  --name type(<color> | <custom-ident>) : zombie,
  --role type(bg | fg | ink)            : bg
) returns <color> {
   
  --role-bg: if(
    style(--name: amethyst)  : #160f1f;
    style(--name: beton)     : #3a3a3a;
    style(--name: classic)   : #ffffff;
    style(--name: desert)    : #e3cfa4;
    style(--name: dracula)   : #282a36;
    style(--name: flamingo)  : #2b1e25;
    style(--name: hell)      : #ffffff;
    style(--name: kontrast)  : #000000;
    style(--name: lavendel)  : #f3f0fa;
    style(--name: matrix)    : #0b0f0b;
    style(--name: nightsky)  : #0b1a2e;
    style(--name: oled)      : #000000;
    style(--name: papier)    : #efe9dd;
    style(--name: parrot)    : #10241a;
    style(--name: petrol)    : #08191a;
    style(--name: rubin)     : #1a0a0f;
    style(--name: smaragd)   : #07160f;
    style(--name: snowflake) : #e9f1f7;
    style(--name: softblack) : #151515;
    style(--name: softwhite) : #f2f2ef;
    style(--name: synthwave) : #241b3a;
    style(--name: tinte)     : #0e0e1a;
    style(--name: zombie)    : #282a36;
    else : --palette-derived(var(--name), bg);
  );
   
  --role-fg: if(
    style(--name: amethyst)  : #ece0f5;
    style(--name: beton)     : #dcdcdc;
    style(--name: classic)   : #000000;
    style(--name: desert)    : #3b2c17;
    style(--name: dracula)   : #f8f8f2;
    style(--name: flamingo)  : #ffe9f1;
    style(--name: hell)      : #101317;
    style(--name: kontrast)  : #ffffff;
    style(--name: lavendel)  : #241c33;
    style(--name: matrix)    : #c8f7c5;
    style(--name: nightsky)  : #dbe4f0;
    style(--name: oled)      : #e9e9e9;
    style(--name: papier)    : #2b2622;
    style(--name: parrot)    : #f3f7e8;
    style(--name: petrol)    : #d5eceb;
    style(--name: rubin)     : #f2dfe3;
    style(--name: smaragd)   : #dff3e6;
    style(--name: snowflake) : #16262f;
    style(--name: softblack) : #e6e6e6;
    style(--name: softwhite) : #1c1c1c;
    style(--name: synthwave) : #ffe9fb;
    style(--name: tinte)     : #dcd9f0;
    style(--name: zombie)    : #f8f8f2;
    else : --palette-derived(var(--name), fg);
  );
   
  --role-ink: if(
    style(--name: amethyst)  : #a855f7;
    style(--name: beton)     : #9ad1d4;
    style(--name: classic)   : #880088;
    style(--name: desert)    : #8a3a0f;
    style(--name: dracula)   : #ff79c6;
    style(--name: flamingo)  : #ff5c8a;
    style(--name: hell)      : #0a66c2;
    style(--name: kontrast)  : #ffff00;
    style(--name: lavendel)  : #6b3fd4;
    style(--name: matrix)    : #39ff14;
    style(--name: nightsky)  : #6ea8fe;
    style(--name: oled)      : #00e5ff;
    style(--name: papier)    : #8f5d3a;
    style(--name: parrot)    : #ff4d2d;
    style(--name: petrol)    : #0fb9ad;
    style(--name: rubin)     : #f2295b;
    style(--name: smaragd)   : #50c878;
    style(--name: snowflake) : #00697a;
    style(--name: softblack) : #ffb86c;
    style(--name: softwhite) : #c2255c;
    style(--name: synthwave) : #f92aad;
    style(--name: tinte)     : #8b7dff;
    style(--name: zombie)    : #ff79c6;
    else : --palette-derived(var(--name), ink);
  );
   
  result: if(
    style(--role: fg)  : var(--role-fg); 
    style(--role: ink) : var(--role-ink); 
    else               : var(--role-bg)
  );
   
}

body [data-palette] {
  --palette   : attr(data-palette type(<color> | <custom-ident>), zombie);

  --color-bg  : --palette-color(var(--palette), bg);
  --color-fg  : --palette-color(var(--palette), fg);
  --color-ink : --palette-color(var(--palette), ink);
   
  --bg        : var(--color-bg);
  --fg        : var(--color-fg);
  --ink       : var(--color-ink);
}
