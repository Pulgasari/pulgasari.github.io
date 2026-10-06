# CSS

## at-rules

```md
### statement at-rules
@charset
@import
@layer
@namespace

### block at-rules
@container
@counter-style
@font-face
@font-feature-values // plus @swash, @ornaments, @annotation, @stylistic, @styleset and @character-variant)
@keyframes
@layer
@media
@page
@position-try
@property
@scope
@starting-style
@supports
@view-transition
```

```css
@identifier (RULE);
@identifier (RULE) {}
```

## function

### color functions

```css
hsl
hsla
hwb
lab
lch
oklab
oklch
rgb
rgba
```

### filter functions (only for images?)

```css
filter: drop-shadow(0.25rem 0 0.75rem #ef9035);
filter: sepia()
```

## units

```md
# length
<dimension>
<integer>
<number>
<percentage>

# dimension
<angle>
<length>
<resolution>
<time>

###
<color>
<hue>
```

```md
cm mm in pc pt px Q
```

```nd
em rem
dvh dvw vh vw
```

- `em` is relative to the font size of this element, or the font size of the parent element when used for `font-size`.
- `rem` is relative to the font size of the root element.
- `vh` and `vw` are relative to the viewport's `height` and `width`, respectively

## Links

### Guides
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Namespaces
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting/At-rules
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax/At-rules

### Guides
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Conditional_rules
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Counter_styles
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties

### Guide: Values & Units
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length

### Reference: SVG
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/filter

### Misc
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://drafts.csswg.org/css-syntax/

- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries
