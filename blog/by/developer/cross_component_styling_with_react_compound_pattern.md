---
title: "Single Source of Truth: Cross-Component Styling with React Compound Pattern"
description: Cross-component styling is more than often in real world application. The blog explores a context-aware styling solutions in React applications, leveraging the Compound Pattern.
tags: [frontend, pattern, react]
featured: false
cover_url: https://zane-portfolio.s3.us-east-1.amazonaws.com/CrossComponentStylingCover.png
created_date: 2025-04-23
last_modified_date: 2025-08-27
---

When* building UI components, Its pretty common that we wanna trigger effects on component based on events on parent component, such as hovering. While applying style to components is straightforward, cross-component styling can become messy without proper control. The Blog explore an elegant solution using [Compound Pattern](blog/by/developer/from_monolithic_to_react_compound_pattern.md) to tackle the contextual styling challenge.

## Styling is Simple

Applying a hover effect to a `Button` is fairly simple, A pure CSS solution is more than enough.

```css
.Button {
  background-color: transparent;
  &:hover {
    background-color: gray;
  }
}
```

## The Challenge: Cross-Component Hover Effect

What if we want to trigger styling transition when hovering on a parent component? Let's say a `Card`. The intuitive solution is to let the parent component apply extra style to the Button.

There are multiple ways to implement this, just mention a few of them:

- Pass extra `style` or `className` props to the `Button`.
- Use in the `@import` syntax to reference `.Button` styles if using CSS modules.
- Reference the component directly as ``[`${Button}`]: {...}`` if using any `CSS-in-JS` solutions.

I will use CSS module as example for my personal preference 🙂.

```css
@import "component/Button.module.css";

.Card {
  &:hover .Button {
    background-color: gray;
  }
}
```

## Problems with the Naive Approach

The solution have several drawbacks:

- **Tight coupling** `Button` and `Card` components together.
- **Duplicating** the rule `background-color: gray;` in both component.
- **Maintainence** become **challenging**, as the similar rule sets would spread through the codebase as this use case increases.

As developers, we hate duplicate things. Thus, I would be happy to extract this out to have it in a util file. However, naming it as a util is inappropriate, since it only serves `Button` component.

[Compound Pattern](blog/by/developer/from_monolithic_to_react_compound_pattern.md) excels at solving these type of issue by breaking component into multiple pieces that communicate in the background to accomplish certain behavior. Unlike normal implementations leverage context API to share states, browser's CSS cascade do the heavy lifting for us 😛.

## The Compound Pattern Solution

Again, fairly simple style sheet.

```css
.Button {
  background-color: transparent;
  &:hover {
    background-color: gray;
  }
}

.HoverContext {
  &:hover .Button {
    background-color: gray;
  }
}
```

And in the React component code, a simple approach is to export the context className.

```tsx
import * as React from 'react'
import buttonStyle from './Button.module.css';

function Button({ lable, onClick, className }: {
    lable: string,
    onClick?(): void,
}) {
    return <div onClick={onClick} className={buttonStyle.Button}>
        <p>{lable}</p>
    </div>
}

Button.HoverContext = buttonStyle.HoverContext;

export default Button;
```

For better reusability and code structure, we can wrap the functionality in a Higher-Order Component.

```tsx
import * as React from 'react'
import clsx from 'clsx';
import buttonStyle from './Button.module.css';

function Button({ lable, onClick }: {
    lable: string,
    onClick?(): void,
}) {
    return <div onClick={onClick} className={buttonStyle.Button}>
        <p>{lable}</p>
    </div>
}

function HoverContext({ children }: { children: React.ReactElement<{ className: string }> }) {
    const originalProps = children.props;
    return React.cloneElement(
        children,
        {
            ...originalProps,
            className: clsx(originalProps.className, buttonStyle.HoverContext)
        }
    );
}

Button.HoverContext = HoverContext;
export default Button;
```

## Usage Examples

On the consumer side, user can choose to opt-in the `HoverContext` when needed.

```tsx
<Button label="Click me" />

// If exporting the className
<div className={Button.HoverContext}>
  <Button label="Hover parent to see effect" />
</div>

// Using the HOC approach
<Button.HoverContext>
  <Card>
    <Button label="Interactive card button" />
  <Card/>
</Button.HoverContext>
```

By doing so, we achieved:

- **Single Source of Truth**: All button related style information in one file.
- **Better Encapsulation**: Button component contain the hover effect styling information in itself.
- **Explicit opt-in**: My favorite aspect, consumers choose when to enable it.

## Ending

We pushed the [Compound Pattern](blog/by/developer/from_monolithic_to_react_compound_pattern.md) to a bit further in this blog, which put forward an elegant solution for context-dependent styling in React. By providing explicit opt-in mechanisms for style behaviors, we maintain component independence while enabling rich interactions between components.

This pattern works particularly well for design systems where you need consistent, composable behaviors across many components without tight coupling.