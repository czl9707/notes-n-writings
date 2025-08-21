---
title: "The CSS Odyssey: Why I Turned back to CSS After Trying Everything Else"
description: "A developer's CSS journey: from vanilla to CSS-in-JS to Tailwind and back to CSS, with hard-earned lessons along the way."
cover_url: https://zane-portfolio.s3.us-east-1.amazonaws.com/CSSSolutionChoiceCover.png
tags:
  - css
  - react
  - frontend
created_date: 2025-05-14
last_modified_date: 2025-08-19
---
**TL;DR:** This is a story of my journey through CSS solutions. Which led to my personal opinion that simpler tools often work better than complex abstractions. CSS-in-JS, zero-runtime CSS-in-JS, and Tailwind all taught me valuable lessons, but they all added build complexity that eventually became more trouble than benefit. And I eventually returned back to CSS Modules for a better maintainability and simplicity.

## Start with Vanilla CSS

I started my web development journey the traditional way years back—HTML, CSS and JS in separate files. When I learned React, I kept the same approach without exploring the solutions ecosystem much. I'd create a `.css` file, import it into my `.jsx` file, and split stylesheets as they grew.

``` tsx
// .container {
//     width: 100%;
//     padding: 0 var(--spacing-block);
// }

function Container({children, className, ...others}) {
	return <div className={clsx(className, "container")}>
		{children}
	</div>
}
```

## Encounter CSS-in-JS

Diving into CSS-in-JS wasn't really a technical choice. My wife, as a UX designer, had good words about [Material Design](https://m3.material.io/), so I headed to [MUI](https://mui.com/) without thinking too much. At that time, [Emotion](https://emotion.sh/docs/introduction) was the first-class citizen there. Meanwhile, my company's UI component library chose [styled-components](https://styled-components.com/) for styling. Both are widely used CSS-in-JS libraries.

Most CSS-in-JS solutions promised something compelling: styling information and UI logic in one place.

``` tsx
const Container = styled("div")({
	width: "100%", 
	padding: "0 var(--spacing-block)"
})
```

Everything felt smooth. Styling information and UI logic co-located in one file. React merges HTML and JS into JSX, and now CSS joined them. Style conflicts weren't a problem anymore—the CSS-in-JS library handled styling definition order on the fly.

Although many complained about CSS-in-JS performance, the web projects I worked on seldom reached the scale where performance became a concern, so I took the benefits for granted.

> **What CSS-in-JS taught me:** Style encapsulation is powerful. Instead of defining global styles that can conflict anywhere, scoped styles help avoid pollution and save hours of debugging. The co-location principle also makes refactoring much easier.

### The Server-Side Reality Check: Zero-Runtime CSS-in-JS

The honeymoon ended when I migrated my SPA to Next.js. Next.js offered App Router and RSC (React Server Components), and I wanted to embrace their benefits.

CSS-in-JS libraries manipulate stylesheets at runtime in the browser, making them fundamentally incompatible with server-side rendering. I had to awkwardly separate components—styling on the client, data fetching on the server. Working with component libraries required extra boilerplate to get things working.

I wasn't alone facing this issue. Zero-runtime CSS-in-JS promised to solve it. Solutions like [Linaria](https://linaria.dev/) and [Pigment-CSS](https://github.com/mui/pigment-css) (MUI's Emotion successor) extract CSS at build time, generating static stylesheets while preserving the CSS-in-JS developer experience.

From a usage perspective, nothing changed:

``` tsx
const Container = styled("div")({
	width: "100%", padding: "0 var(--spacing-block)"
})
```

The _magic_ happened during transpilation. CSS content gets extracted to static files, and class names are injected back into JavaScript.

This sounded promising—the webpack plugin would handle everything. After using it for a while, the main drawback was the debugging experience. The tool became essentially a black box. Error messages were cryptic and interfered with other tooling. This became worse in Next.js context (Yeah, another black box).

> **Important lesson learned:** Don't make things that should be static dynamic. Don't sacrifice runtime performance for developer experience, especially when the build complexity trade-off isn't worth it.

### The Eventual Leave

The breaking point came when integrating with the [unifiedjs](https://unifiedjs.com/) ecosystem. After 8 hours of removing code piece by piece to isolate a build error—with completely non-descriptive error messages—I gave up.

I can only describe the issue as "build-time interference between unified and Pigment-CSS." Maybe it was about server/client side bundling, maybe ESM/CommonJS module conflicts. I wasn't experienced enough to tell.

## Maybe It's Time to Join Tailwind

Tailwind is likely the most popular CSS solution library. There are massive utilities and plugins built around it. Popular UI component libraries like [shadcn/ui](https://ui.shadcn.com/) use Tailwind by default, making it even more popular. With so many good words, why not give it a try?

### Tailwind Itself Is a Language

Tailwind is an abstraction layer upon CSS, built by experienced and smart CSS developers.

It's great! I learned a lot by studying how they structure CSS code. One excellent example: when defining color token CSS variables, instead of `--my-color: rgb(0 0 0);`, we can do `--my-color: 0 0 0;`. Then when consuming: `color: rgb(var(--my-color) / 50%);`, which gives us easier opacity control.

However, migrating from CSS-in-JS to Tailwind brought quite a learning curve. It took time to memorize class naming conventions—`p-1` means `padding: 4px`, pseudo-class effects like `&:hover .class` become `group-hover:<...>`.

Initially I thought Tailwind was simple—just a huge predefined stylesheet. Actually, it's more complex then I expected. It utilizes [PostCSS](https://github.com/csstools/postcss-plugins) to perform tree shaking and collect arbitrary classes during build time. Extra learning was required beyond basic usage. For example:

- Config theme tokens in `tailwind.config.js` and use them correctly.
- Tailwind doesn't handle style conflicts by itself. To solve this, There is another NPM package to install `tw-merge`.
- Dynamic styling is not native. They all have to be whitelisted in `safelist` inside `tailwind.config.js`, or just fall back to CSS variables.

> **What Tailwind taught me:** Systematic design thinking and utility-first patterns. The constraint-based approach forced better design decisions and taught me about consistent spacing systems and color schemes.

### The Backfire of Tailwind

The real issue was readability. Tailwind made applying styles extremely easy—too easy. I found myself writing class strings like below and it keeps growing.

``` tsx
"group-hover:text-foreground text-foreground/75 transition-colors duration-500 col-span-1 min-w-[33%] text-right lg:text-right"
```

These strings kept growing, containing layout, colors, hover states, responsive breakpoints—everything mashed together without structure or hierarchy, not even indentation. Reading this is like parsing a dense command line with multiple flags and options all crammed together.

It felt like inline styles with extra steps—and arguably less readable than inline styles because of the abbreviated syntax.

At meantime, I found my self duplicating some set of class name very often. Tailwind docs suggested creating my own utility classes, using `@apply`.

``` css
.my-typography {
	@apply group-hover:text-foreground text-foreground/75 transition-colors duration-500 col-span-1 min-w-[33%] text-right lg:text-right;
}
```

At this point, I realized I was just writing CSS with an abstraction layer on top. What was the benefit over vanilla CSS?

## CSS Module, The Final Frontier

Both CSS-in-JS and Tailwind increase build-time complexity, and add extra abstraction layers. It gets worse that when the solution create issues that involve more tools on top of them.

I eventually returned to my old friend CSS—but not the poorly structured CSS I started with. The experiments with CSS-in-JS and Tailwind taught me valuable patterns and techniques:

CSS Modules come with challenges, and I can't find optimal solutions for everything:

**Style conflicts** is one. Although CSS class definitions are placed in reverse import order, problems still occur in Next.js when some pieces only appear in page but not layout CSS bundles. Following [BEM (Block Element Modifier)](https://getbem.com/) and "Composition over Extension" patterns to separate concerns helps avoid styling collisions significantly.

**Media query has limitations**. `@media(min-width: var(--breakpoint-lg))` won't work. [PostCSS](https://github.com/csstools/postcss-plugins) plugins support custom media query `@custom-media --small-viewport (max-width: 30rem);`, then `@media (--small-viewport)`. Still duplications, but at least I can have breakpoints all defined in one file.

## Ending

This round trip helped me form my tool selection principle: **minimize build process interference**. Every abstraction promises to solve problems but adds its own complexity.

The goal is never finding the "perfect" CSS solution, but choosing tools that align with your project's constraints. For me, that means keeping the build process simple and letting things do what they should do.

Sometimes the best path forward takes you back to where you started, armed with everything you learned along the way.