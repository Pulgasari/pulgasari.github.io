import { css } from '@aufbau/stylescript';

function bla (str) { return str[0]; }
console.log(bla`hello world!`); // output: "hello world!"

// Helper function to combine string fragments and interpolated values

function css (strings, ...values) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ?? '');
  }, '');
}

const css = (str, ...vals) => str.reduce((r,s,i) => (r + s + (vals[i] ?? '')), '');


// Define reusable sub-snippets
const colorWithBenefits = css`type(<color> | bg | fg | ink)`;

// Construct the main CSS string
let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg ${colorWithBenefits} : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);

// ::::::::: extended variant 1

import { css } from '@aufbau/stylescript';

css.types.colorWithBenefits      = css`type(<color> | bg | fg | ink)`;
css.types['color-with-benefits'] = css`type(<color> | bg | fg | ink)`;

let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg <color-with-benefits> : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);

// ::::::::: extended variant 2

import { css, types } from '@aufbau/stylescript';

types.colorWithBenefits      = css`type(<color> | bg | fg | ink)`;
types['color-with-benefits'] = css`type(<color> | bg | fg | ink)`;

let doc = '';
doc += css`
  @function --resolve-color-argument(
    --arg <color-with-benefits> : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;
console.log(doc);




const colorWithBenefits = css`type(<color> | bg | fg | ink)`;
const colorWithBenefits = type`<color> | bg | fg | ink`;

doc += css`
  @function --resolve-color-argument(
    --arg ${colorWithBenefits} : currentColor
  ) returns <color> {
    result: if(
      style(--arg: bg)  : var(--color-bg);
      style(--arg: fg)  : var(--color-fg);
      style(--arg: ink) : var(--color-ink);
      style(--arg: cc)  : currentColor;
      else              : var(--arg);
    );
  }
`;

doc += ss`
  @fn resolve-color-argument(
    arg ${colorWithBenefits} = currentColor
  ) returns <color> {
    result: switch (arg) {
      bg  : $color-bg;
      fg  : $color-fg;
      ink : $color-ink;
      cc  : currentColor;
      _   : $arg;
    };
  }
`;


/* returns the negative of a value */
@function --negate(--value type(<length> | <number>)) {
  result: calc(-1 * var(--value));
}

/* custom light-dark() function that works for any value */
/* found here: https://www.bram.us/2025/09/30/css-custom-light-dark/ */
@function --light-dark(--l, --d) { result: if(color-scheme(dark): var(--d); else: var(--l)); }
@function --ld(--L, --D) { result: if(color-scheme(dark): var(--D); else: var(--L)); }

/*//////////// COLOR ////////////*/

/* HELPERS (experimental) */

@function --resolve-color-argument(
  --arg type(<color> | bg | fg | ink) : currentColor
) returns <color> {
  result: if(
    style(--arg: bg)  : var(--color-bg);
    style(--arg: fg)  : var(--color-fg);
    style(--arg: ink) : var(--color-ink);
    style(--arg: cc)  : currentColor;
    else              : var(--arg);
  );
}

@function --alpha(
  --color   <color>      : currentColor,
  --opacity <percentage> : 50%,
  --mode                 : oklch
) returns <color> {
  result: color-mix(in var(--mode), var(--color) var(--opacity), transparent);
}

@function --mix(
  --from   type(<color> | bg | fg | ink) : var(--color-bg),
  --to     type(<color> | bg | fg | ink) : var(--color-fg),
  --amount <percentage>                  : 50%,
  --mode                                 : oklch
) returns <color> {
  --F: --resolve-color-argument(var(--from));
  --T: --resolve-color-argument(var(--to));
  result: color-mix(in var(--mode), var(--F), var(--T) var(--amount));
}

@function --darker(
  --color  type(<color> | bg | fg | ink) : currentColor,
  --number <number> : 0.1
) returns <color> {
  --C : --resolve-color-argument(var(--color));
  result  : oklch(from var(--C) max(0, l - var(--number)) c h / alpha);
}

@function --lighter(
  --color  <color>  : currentColor,
  --number <number> : 0.1
) returns <color> {
  --C : --resolve-color-argument(var(--color));
  result: oklch(from var(--C) min(1, l + var(--number)) c h / alpha);
}



/* towards the background or the foreground: lighter or darker depending on the
   scheme, so a tint reads the same in light and dark */
@function --tint(
  --C <color>      : var(--accent),
  --N <percentage> : 20%
) returns <color> {
  result: color-mix(in oklch, var(--C), var(--bg) var(--N));
}

@function --shade(
  --C <color>      : var(--accent),
  --N <percentage> : 20%
) returns <color> {
  result: color-mix(in oklch, var(--C), var(--fg) var(--N));
}

/* a fixed lightness, 0 black to 1 white: --tone(var(--accent), 0.95) is a pale background in the accent's hue */
@function --tone(
  --C <color>  : var(--accent),
  --N <number> : 0.5
) returns <color> {
  result: oklch(from var(--c) var(--N) c h / alpha);
}

/* chroma times --factor, 0 is grey, above 1 more vivid */
@function --saturate(
  --color  <color>  : currentColor,
  --factor <number> : 1.5
) returns <color> {
  result: oklch(from var(--color) l calc(c * var(--factor)) h / alpha);
}

@function --grayscale(--C <color> : currentColor) returns <color> 
{ result: oklch(from var(--C) l 0 h / alpha); }






/*
@type color-with-benefits = <color> | bg | fg | ink

@fn darker (
  $color  <color-with-benefits> = currentColor,
  $number <number>              = 0.1
) <color> { 
  result: darker ($fg, $n);
}

@fn fg-darker  ($n <number> = 0.1) <color> { result: darker  ($fg, $n) }
@fn fg-lighter ($n <number> = 0.1) <color> { result: lighter ($fg, $n) }
*/



@function --hue-shift(
  --color <color> : var(--ink),
  --angle <angle> : 30deg
) returns <color> {
  result: oklch(from var(--color) l c calc(h + var(--angle) / 1deg) / alpha);
}

@function --complement(--color <color> : var(--ink)) returns <color> 
{ result: --hue-shift(var(--color), 180deg); }

/* the neighbours on the wheel: --analogous(var(--accent), -1) and (…, 1) */
@function --analogous(
  --color <color>  : var(--accent, royalblue),
  --step  <number> : 1,
  --angle <angle>  : 30deg
) returns <color> {
  result: --hue-shift(var(--color), calc(var(--angle) * var(--step)));
}

/* black or white, whichever reads on --background. the lightness is pushed
   against a threshold and clamped, so the result is exactly 0 or 1 */
@function --on(
  --background <color>  : var(--accent, royalblue),
  --threshold  <number> : 0.62
) returns <color> {
  result: oklch(from var(--background) clamp(0, (var(--threshold) - l) * 1000, 1) 0 0);
}

/* the text color between --fg and --bg: 0 is --fg, 100% the background */
@function --muted(--amount <percentage> : 50%) returns <color>
{ result: color-mix(in oklch, var(--fg), var(--bg) var(--amount)); }

/* surfaces stacked on the background: every level mixes a bit more --fg in.
   cards, panels, zebra rows, in light and dark alike */
@function --surface(
  --level <number>     : 1,
  --step  <percentage> : 4%
) returns <color> {
  result: color-mix(in oklch, var(--bg, white), var(--fg, black) calc(var(--level) * var(--step)));
}

/* one color, its interaction states: hover, active, focus, disabled */
@function --state(
  --color <color>        : var(--accent, royalblue),
  --state type(normal | hover | active | focus | disabled) : normal
) returns <color> {
  result: if(
    style(--state: hover)    : color-mix(in oklch, var(--color), var(--fg, black) 12%);
    style(--state: active)   : color-mix(in oklch, var(--color), var(--fg, black) 24%);
    style(--state: focus)    : color-mix(in oklch, var(--color), var(--bg, white) 12%);
    style(--state: disabled) : oklch(from var(--color) l calc(c * 0.2) h / 0.5);
    else                     : var(--color)
  );
}

/* light-dark() by name, follows color-scheme */
@function --scheme(
  --light <color> : white,
  --dark  <color> : black
) returns <color> {
  result: light-dark(var(--light), var(--dark));
}

/*//////////// SPACE AND SIZE ////////////*/

/* multiples of --unit, as a number or by name: --space(4) and --space(normal)
   are both 1rem with the default 0.25rem. the keywords are part of the type,
   an unknown one falls back to the default instead of invalidating the value */
@function --space(
  --size type(<number> | tiny | small | normal | large | huge) : normal
) returns <length> {
  --steps: if(
    style(--size: tiny)   :  1; /* 0.25rem */
    style(--size: small)  :  2; /* 0.5rem  */
    style(--size: normal) :  4; /* 1rem    */
    style(--size: large)  :  6; /* 1.5rem  */
    style(--size: huge)   : 10; /* 2.5rem  */
    else                  : var(--size);
  );
  result: calc(var(--unit, 0.25rem) * var(--steps));
}

/* a modular scale: --step(0) is the base, every step --ratio times more.
   font sizes and larger spaces off one ratio */
@function --step(--n <number> : 0) returns <length> {
  result: calc(var(--base-size, 1rem) * pow(var(--ratio, 1.25), var(--n)));
}

/* grows from --min at --from wide to --max at --to wide, clamped outside */
@function --fluid(
  --min  <length> :  1rem,
  --max  <length> :  2rem,
  --from <length> : 20rem,
  --to   <length> : 80rem
) returns <length> {
  result: clamp(
    var(--min),
    calc(var(--min) + (var(--max) - var(--min)) * (100vw - var(--from)) / (var(--to) - var(--from))),
    var(--max)
  );
}

/* line height for a --step: large type sits tighter */
@function --leading(--n <number> : 0) returns <number>
{ result: clamp(1.1, 1.55 - var(--n) * 0.08, 1.7); }

/* letter spacing for a --step: large type a little tighter, small a little wider */
@function --tracking(--n <number> : 0) returns <length>
{ result: calc(var(--n) * -0.012em); }

/* a readable line length, never wider than the parent */
@function --measure(--characters <number> : 65) returns <length-percentage>
{ result: min(100%, calc(var(--characters) * 1ch)); }

/* the side padding that centers --width content in a full width parent, at least
   --minimum. for full bleed layouts: padding-inline: --gutter(60rem) */
@function --gutter(
  --width   <length> : 60rem,
  --minimum <length> : 1rem
) returns <length-percentage> {
  result: max(var(--minimum), (100% - var(--width)) / 2);
}

/* a touch target no smaller than --minimum, 44px is the platform guideline */
@function --tap(
  --size    <length> : 2rem,
  --minimum <length> : 44px
) returns <length> {
  result: max(var(--size), var(--minimum));
}

/* a safe area inset plus --extra: padding-top: --safe(top, 1rem) */
@function --safe(
  --side  type(top | right | bottom | left) : top,
  --extra <length>                         : 0px
) returns <length> {
  result: if(
    style(--side: right)  : calc(env(safe-area-inset-right,  0px) + var(--extra));
    style(--side: bottom) : calc(env(safe-area-inset-bottom, 0px) + var(--extra));
    style(--side: left)   : calc(env(safe-area-inset-left,   0px) + var(--extra));
    else                  : calc(env(safe-area-inset-top,    0px) + var(--extra));
  );
}

/* px written as rem, so the size follows the user's font setting */
@function --rem(--pixels <number> : 16) returns <length> {
  result: calc(var(--pixels) / 16 * 1rem);
}

/* between --from and --to by --progress, 0 to 1 */
@function --lerp(
  --from     <length-percentage> : 0px,
  --to       <length-percentage> : 1rem,
  --progress <number>            : 0.5
) returns <length-percentage> {
  result: calc(var(--from) + (var(--to) - var(--from)) * var(--progress));
}

/*//////////// SHAPE AND DEPTH ////////////*/

/* the radius inside a rounded box with padding, so nested corners stay parallel */
@function --inner-radius(
  --outer   <length> : var(--radius, 0.75rem),
  --padding <length> : 0.5rem
) returns <length> {
  result: max(0px, var(--outer) - var(--padding));
}

/* layered shadows, 0 flat to about 5 floating, tinted with --fg so they fit
   the theme */
@function --elevation(
  --level <number> : 1,
  --color <color>  : var(--fg, black)
) {
  result:
    0 calc(var(--level) * 1px) calc(var(--level) * 2px)  --alpha(var(--color), calc(var(--level) * 3% + 4%)),
    0 calc(var(--level) * 4px) calc(var(--level) * 10px) --alpha(var(--color), calc(var(--level) * 2% + 2%));
}

/* a focus ring as box-shadow, with a gap in the background color */
@function --ring(
  --color  <color>  : var(--accent, royalblue),
  --width  <length> : 2px,
  --offset <length> : 2px
) {
  result: 0 0 0 var(--offset) var(--bg, white), 0 0 0 calc(var(--offset) + var(--width)) var(--color);
}

/* a thin border in the line color */
@function --hairline(--color <color> : --alpha(var(--fg, black), 15%)) {
  result: 1px solid var(--color);
}

/*//////////// BACKGROUNDS AND MASKS ////////////*/

/* diagonal stripes, for placeholders and disabled areas */
@function --stripes(
  --color <color>  : --alpha(var(--fg, black), 8%),
  --size  <length> : 8px,
  --angle <angle>  : 45deg
) returns <image> {
  result: repeating-linear-gradient(var(--angle), var(--color) 0 var(--size), transparent var(--size) calc(var(--size) * 2));
}

/* a checkerboard, behind transparent images */
@function --checkerboard(
  --color <color>  : --alpha(var(--fg, black), 8%),
  --size  <length> : 12px
) {
  result: repeating-conic-gradient(var(--color) 0 25%, transparent 0 50%) 0 0 / calc(var(--size) * 2) calc(var(--size) * 2);
}

/* a mask that fades the edges of a scroll area: mask-image: --fade-edges(1.5rem) */
@function --fade-edges(
  --size      <length>                    : 1rem,
  --direction type(vertical | horizontal) : vertical
) returns <image> {
  result: if(
    style(--direction: horizontal) : linear-gradient(to right,  transparent, black var(--size), black calc(100% - var(--size)), transparent);
    else                           : linear-gradient(to bottom, transparent, black var(--size), black calc(100% - var(--size)), transparent);
  );
}

/* a gradient out of one color. tonal: lighter to darker in its own hue, vivid:
   the ends also turn ±20° on the wheel, fade: the color into transparent.
   interpolated in oklch, so two hues do not pass through grey */
@function --gradient(
  --color  <color>                       : var(--accent, royalblue),
  --style  type(tonal | vivid | fade)    : tonal,
  --shape  type(linear | radial | conic) : linear,
  --angle  <angle>                       : 135deg,
  --spread <number>                      : 0.08
) returns <image> {
  --start: if(
    style(--style: vivid) : oklch(from var(--color) min(1, l + var(--spread)) c calc(h - 20) / alpha);
    style(--style: fade)  : var(--color);
    else                  : oklch(from var(--color) min(1, l + var(--spread)) c h / alpha);
  );
  --end: if(
    style(--style: vivid) : oklch(from var(--color) max(0, l - var(--spread)) c calc(h + 20) / alpha);
    style(--style: fade)  : oklch(from var(--color) l c h / 0);
    else                  : oklch(from var(--color) max(0, l - var(--spread)) c h / alpha);
  );
  result: if(
    style(--shape: radial) : radial-gradient(circle at top left in oklch, var(--start), var(--end));
    style(--shape: conic)  : conic-gradient(from var(--angle) in oklch, var(--start), var(--end), var(--start));
    else                   : linear-gradient(var(--angle) in oklch, var(--start), var(--end));
  );
}

/* a soft glow of --color from the top, for hero areas and cards */
@function --glow(
  --color <color>      : var(--accent, royalblue),
  --size  <percentage> : 60%
) returns <image> {
  result: radial-gradient(ellipse at top, --alpha(var(--color), 25%), transparent var(--size));
}

/*//////////// MOTION ////////////*/

/* named easing curves */
@function --ease(
  --kind type(smooth | snappy | enter | exit | bounce | spring | linear) : smooth
) {
  result: if(
    style(--kind: snappy)     : cubic-bezier(0.2, 0, 0, 1);
    style(--kind: enter)      : cubic-bezier(0, 0, 0.2, 1);
    style(--kind: exit)       : cubic-bezier(0.4, 0, 1, 1);
    style(--kind: bounce)     : linear(0, 0.36 18%, 0.98 36%, 0.84 45%, 1 58%, 0.95 66%, 1 80%, 0.99 88%, 1);
    style(--kind: spring)     : linear(0, 0.21 6%, 0.66 14%, 1.03 24%, 1.12 30%, 1.07 38%, 0.99 48%, 0.98 58%, 1 72%, 1);
    style(--kind: linear)     : linear;
    else                      : cubic-bezier(0.4, 0, 0.2, 1);
  );
}

/* named durations times --motion, a token that goes to 0 for reduced motion:
   @media (prefers-reduced-motion: reduce) { :root { --motion: 0; } } */
@function --duration(
  --speed type(instant | fast | normal | slow | lazy) : normal
) returns <time> {
  result: calc(var(--motion, 1) * if(
    style(--speed: instant) : 60ms;
    style(--speed: fast)    : 120ms;
    style(--speed: slow)    : 400ms;
    style(--speed: lazy)    : 700ms;
    else                    : 200ms;
  ));
}

/* one transition entry: transition: --transition(opacity), --transition(transform, slow, spring) */
@function --transition(
  --property <custom-ident>                                                   : all,
  --speed    type(instant | fast | normal | slow | lazy)                      : normal,
  --kind     type(smooth | snappy | enter | exit | bounce | spring | linear) : smooth
) {
  result: var(--property) --duration(var(--speed)) --ease(var(--kind));
}

/*//////////// LAYERS ////////////*/

/* z-index by name, one order for the whole system */
@function --z(
  --layer type(base | below | raised | dropdown | sticky | overlay | modal | toast | tooltip) : base
) returns <integer> {
  result: if(
    style(--layer: below)    : -1;
    style(--layer: raised)   : 10;
    style(--layer: dropdown) : 100;
    style(--layer: sticky)   : 200;
    style(--layer: overlay)  : 300;
    style(--layer: modal)    : 400;
    style(--layer: toast)    : 500;
    style(--layer: tooltip)  : 600;
    else                     : 0;
  );
}

/*//////////////////////// MAYBE TRASH ////////////////////////*/

/* if the 'resolve-color-argument' helper works we would not neeed these */
@function   --bg-darker(--n <number> : 0.1) returns <color> { result:  --darker(var(--bg), var(--n)); }
@function   --fg-darker(--n <number> : 0.1) returns <color> { result:  --darker(var(--fg), var(--n)); }
@function  --bg-lighter(--n <number> : 0.1) returns <color> { result: --lighter(var(--bg), var(--n)); }
@function --fg-lighter-(--n <number> : 0.1) returns <color> { result: --lighter(var(--fg), var(--n)); }
