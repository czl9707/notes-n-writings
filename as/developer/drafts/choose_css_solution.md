---
title: CSS-in-JS? Tailwind? Neither of Them.
description: My opinioned story of choosing CSS solution.
cover_url: 
tags:
  - react
  - styling
---
I am a backend developer in my 9-5 job, and trying to explore the world of frontend for roughly one year so far. 

I learnt web development start from HTML, CSS and JS, then jumped into the ecosystem of React. Without seeking for specific CSS solution, I started to styling components in the vanilla way. Just start with a `.css` file, import it in `.jsx/tsx` file, and split the CSS file when needed. Or, I can just put inline styles within component properties.

## Encounter CSS-in-JS
Hearing about some good words about [Material Design](https://m3.material.io/), I headed to [MUI](https://mui.com/), where [Emotion](https://emotion.sh/docs/introduction) was the first class citizen at that moment. And at the same time, I touched some frontend work in my daily job, and the company UI component library chose [styled-components](https://styled-components.com/) for styling. For those never used these, `Emotion` and `styled-components` were both widely used CSS-in-JS libraries. 

Thus, Instead of writing:
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

I started to write CSS code right within `.jsx/tsx` file.
``` tsx
const Container = styled("div")({
	width: "100%", padding: "0 var(--spacing-block)"
})
```

Everything feels so smooth. Styling information and UI logic in one place. No longer need to worry about style conflict, since CSS-in-JS library helps me keep styling definition in the right order. And, no CSS file anymore.

React merges HTML and JS into JSX, and now CSS goes into them as well. A lot complaints went into the performance aspect of the CSS-in-JS solution, but since the web projects I touched seldom went beyond the scale worry about performance, I took the good side of `CSS-in-JS` for granted.
### The Darkside of CSS-in-JS

It came at the moment I migrating my SPA to `Next.js`. App Router and RSC (React Server Component) were already launched, and I wanted to embrace the benefits brought by Server Components as well.

CSS-in-JS libraries like `Emotion` and `styled-components` manipulate stylesheet in browser at runtime. Thus, it isn't surprised that they will only work on client side. These client-side only behavior create a lot of issue in context of RSC and server side rendering. For example, I have to separate component to have the styling on client and data fetching on server side.
### Zero-Runtime CSS-in-JS

Of course, I am not the only one facing this issue, there were already some existing solution out there to bring CSS-in-JS from client side to server side. [Linaria](https://linaria.dev/)is one of them and MUI switched from `Emotion` to [Pigment-CSS](https://github.com/mui/pigment-css). From usage perspective, very little things changed, not even interfaces. The *Magic* happened in build-time. The transpiler extract the CSS content out into a static `.css` asset, and inject the CSS class name back into JS code.

This sounds extremely promising, the transpiler plugin will take care of everything. After using this for a while, the only drawback I found is about debug experience. I found the library is actually a black box, the error it emits interfere with errors from other libraries, making it hard to identify and locate bugs. And this become even worse when using in context of `Next.js`(Yeah, another black box).

The final kill comes when integrating with [unifiedjs](https://unifiedjs.com/) ecosystem. The error is completely not descriptive, and I have to remove piece by piece to narrow down the cause. Although I am still not able to find the exact root cause, the build-time interference from `Pigement-CSS` caused some piece got bundled incorrectly on server side.

After spent 8 hours on this, I gave up.
## Maybe It is the Time to Join Tailwind

Tailwind is likely the most popular CSS Solution library. There are tons of utilities and plugins built around it. And popular UI component libraries like [shadcn/ui](https://ui.shadcn.com/) use Tailwind by default make it even more popular. So many people have good words, why not give it a try.

### Tailwind is another language

That cannot be right more. The process of migrating from `CSS-in-JS` to `Tailwind` requires quite some learning curve. Just list some problems I experienced:
- It took me sometime to memorize some of those class naming convention, such as `-p-1` is actually `padding: -4px;`, Pseudo-classes effect like `&:hover .class` can be implemented using `group-hover:<...>`. 
- Different CSS Solution have different way of configuring themes. Ok, another round of doc reading and learning to config the `tailwind.config.js` and use the themes in a right way.
- Since the core of Tailwind is a giant stylesheet with tons of utility classes inside, how we handle style conflicts? There is another NPM package to install `tw-merge`. 
- Tailwind preprocess our source code and do tree shaking on the stylesheet at build time, so those class names do not show up in the source code will be shaken off. So how we handle dynamic styling? Put them in `safelist` inside `tailwind.config.js`, or just fall back to CSS variables.

### Backfire of Tailwind

Applying style in Tailwind is extremely easy, just append another class name to the list, which easily leads to a really long class name like. `"group-hover:text-foreground text-foreground/75 transition-colors duration-500 col-span-1 min-w-[33%] text-right lg:text-right"`. The string can contain properties including layout, color, peering states, parent states, media query conditional styling, all in one string, not even any indentation. Hard to read and debug. And from the aspect of a `.jsx/tsx` file, it feels very similar to have inline styling on each components.

At meantime, I found my self duplicating some set of class name very often. And Tailwind docs ask to create my own utility class, using `@apply`. 

``` css
.Container {
	@apply w-full p-2;
}
```

What's the difference between this and writing vanilla CSS? It just abstract CSS properties into class names, and create another language out of it.

## CSS Module, The Final Frontier

Both CSS-in-JS and Tailwind interfere with build process, inspecting the source JS code and making some modification. In order to solve most of problems I encountered, I have to understand more about the how the tool convert things into CSS file.

Therefore, I eventually turned to my old friend, CSS. When I dropped those fancy tools, I found CSS it self is actually sufficient to solve most of the styling challenge, while keep the JS bundle size fairly small. 

Although I had some complaint against these CSS solutions, but I did learn a lot from using them, in terms of how to write better structured CSS code. One example is when designing color theme token, the token should not include transparency information. By setting `--color-default-background: 0 0 0;`, we can apply transparency on consumer side `rgb(var(--color-default-background) / 50%)`.

But CSS module do have some challenge, one is style conflicts. Although CSS class definition will be placed in the reverse order of they imported, it still have problem in next.js when some pieces only appears in page or layout CSS bundle. I found following [BEM(Block Element Modifier)](https://getbem.com/) and "Composition over Extension" pattern helps a lot avoid styling collision.

And there do exist some problem I can only find sub-optimal solutions. Such as media query cannot reference CSS variables, we cannot have `@media(min-width: var(--breakpoint-lg))`. I can use some [PostCSS](https://github.com/csstools/postcss-plugins) plugins to write `@custom-media --small-viewport (max-width: 30rem);`, then `@media (--small-viewport)`, but I still have to duplicate the width value, which is sub-optimal to me.
## Ending

It feels like a round trip when selecting my CSS solution. Started with knowing nothing and writing poorly maintained CSS code, then I dive into the different CSS solution ecosystem. And finally back to (almost) pure CSS solution, in order to get rid of as much build process interference as possible.