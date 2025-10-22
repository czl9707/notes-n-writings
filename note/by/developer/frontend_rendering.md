---
title: Frontend Rendering
tags: [react, web-dev]
created-date: 2025-10-16T00:00:00-04:00
last-updated-date: 2025-10-19T15:02:13-04:00
---

## Server Side Rendering (Classic)

Before Frontend framework become a thing, interpolating HTML with runtime value on server is the mostly common way to render webpages. The HTML content are generated on server instead of client side JS.

The initial page load times will be relatively faster, but every route change will have a client-server round trip.

## React

### Client Side Rendering (React)

React start with **Single Page Application (SPA)** design, meaning the route change is handled on client side. Web page assets are shipped at initial page load. The majority of the web content are rendered using JS.

The initial page load times will be slower in general. After browser receive JS assets, it usually require some time to render the correct HTML content and making few remote requests before it is able to paint the full screen. However, most of jobs will be done in the initial load, following route changes will be way faster.

Note, the "single page" behavior is only valid when using React Router for routing. If a default `<a/>` is used, it will be treated as a reload, meaning re-fetching everything.

#### Lazy Loading & Code Splitting

Client Side Rendering struggle with initial load, to improve that, the entire JS bundle can be split into multiple smaller chunks, to load separately when needed. By doing so, non-critical content can be deprioritized and loaded after the initial page load finished.

### Server Side Rendering (React)

Client side rendering outperform a lot of aspects, except the initial load time. One solution is called "Server Side Rendering", which is a bit different from the [Classic Server Side Rendering](#Server%20Side%20Rendering%20(Classic)).

To improve the **First Content Paint (FCP)**, the page is rendered into HTML on server, and sent to browser together with JS bundle, so user can see some meaningful contents on their screen while all the initial load is happening under the hood.

However one draw back is that, React cannot establish the relationship between the HTML content and its virtual DOM. React would have to construct the DOM tree and from scratch, and attach listeners to the DOM tree. This process is called **Hydration**, and during which the interaction aspect of the page is missing.

#### Progressive Hydration

The hydration process can take a long time, similar to the idea of [Lazy Loading & Code Splitting](#Lazy%20Loading%20&%20Code%20Splitting), hydration process for non-critical pieces of the site can be postponed. By separating the client side JS bundle, and delay the load. So users and interact with critical pieces much sooner.

### React Server Component

**React Server Component (RSC)** combine the benefits of both [Client Side Rendering](#Client%20Side%20Rendering%20(React)) and [Server Side Rendering](#Server%20Side%20Rendering%20(React)). RSC allows a page to be rendered in a hybrid mode, partially on server and partially on client, and React on client side can stitching different pieces together.

Different from Server Side Rendering, the rendered content is sent as HTML, RSC render them as JSON with tag name, properties and node information. So that React on client side can convert JSON into virtual DOM and combine them with other pieces.

Server Components are not interactive by design. To gain the ability of interaction, the Server Component would include a Client Component as its child, and pass arguments to Client Component if needed.

## Static Site Generation

A lot of pages will have the same content every time it got visit, either rendering them on client or server would be a waste of computing resources and time.

**Static Site Generation (SSG)** attempts to resolve the issues by delivering pre-rendered HTML content to the client that was generated when the site was built. But this is only applicable to pages where the content are static.

## Incremental Static Regeneration

**Incremental Static Regeneration (ISR)** is a smarter version of [Static Site Generation](#Static%20Site%20Generation). There are many cases where the content of the website will keep getting updated, it will be cumbersome to have the site rebuild every time there are some content update, even just fixing a typo.

ISR generate pages on some kind of trigger. It can be a scheduled re-generation or any kind of special event. Which allow generating pages selectively and without a entire rebuild.