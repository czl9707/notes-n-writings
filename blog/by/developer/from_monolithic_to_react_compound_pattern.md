---
title: "Breaking Down React Components: From Monolithic to Compound Pattern"
description: Struggling with monolithic React components? Break it into small pieces and embrace the compound pattern to achieve intuitive composition and unlimited customization.
cover_url: https://zane-portfolio.s3.us-east-1.amazonaws.com/CompoundPatternCover.png
tags: [frontend, pattern, react]
featured: false
created_date: 2025-04-07
last_modified_date: 2025-08-27
---

React give us the powerful capability to manage states within component, and encapsulating state is generally considered a best practice. However, in real-world applications, it is more than often that UI features require multiple interconnected pieces to function properly.

The traditional approach is to build a monolithic component that contains everything related to a feature, lifting shared state to the top level. The **Compound Component pattern** is a more elegant solution of handling states in complex components. The pattern seperates the concerns by breaking component into multiple pieces that communicate in the background to accomplish certain behavior. Many popular component library, such as [Radix Primitive](https://www.radix-ui.com/primitives) and [Shadcn/ui](https://ui.shadcn.com/), leverage Compound Component pattern extensively.

## The Monolithic Approach: Building an Accordion

Let's start with a common UI component, an accordion, and examine how it's typically implemented. An accordion consists of:

- A button to control the collapse behavior
- A header to display the title (always visible)
- A content area that can be expanded or collapsed

Here's a minimal monolithic implementation:

:::multi-codeblocks

```tsx filename=accordion.tsx
import React from "react"
import accordionStyle from './accordion.module.css'
import { ChevronDown } from "./icon";

export default function Accordion({ title, children }: {
    title?: string,
    children: React.ReactNode,
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return <div data-collapsed={isCollapsed} className={accordionStyle.AccordionRoot}>
        <div className={accordionStyle.AccordionHeader}
            onClick={() => setIsCollapsed(collapsed => !collapsed)}>
            <h6>{title}</h6>
            <ChevronDown className={accordionStyle.AccordionTrigger} />
        </div>
        <div className={accordionStyle.AccordionContent}>
            {children}
        </div>
    </div>
}
```

```css filename=accordion.module.css
.AccordionRoot {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border-radius: 4px;
    border: rgb(255 255 255 / 20%) 1px solid;
    overflow: hidden;
}

.AccordionHeader {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    padding: .15rem .5rem;
    margin: 1rem;
    border-radius: 4px;

    transition: background-color .2s linear;

    &:hover {
        background-color: rgb(255 255 255 / 10%);
    }
}

.AccordionContent {
    overflow-y: scroll;
    box-sizing: border-box;
    background-color: rgb(255 255 255 / 10%);
    border-radius: 4px;

    &::-webkit-scrollbar {
        display: none;
    }

    .AccordionRoot[data-collapsed=false] & {
        margin: 0 1rem 1rem 1rem;
        padding: 1rem;
        max-height: 15rem;
        opacity: 1;
        transition: all .2s linear,
            opacity .2s .2s linear;
    }

    .AccordionRoot[data-collapsed=true] & {
        margin: 0 1rem;
        padding: 0 1rem;
        max-height: 0;
        opacity: 0;
        transition: all .2s .2s linear,
            opacity .2s linear;
    }
}

.AccordionTrigger {
    transform: none;
    transition: transform .2s linear;

    .AccordionRoot[data-collapsed=true] & {
        transform: rotate(180deg);
    }
}
```

:::

![Raw Accordion](https://zane-portfolio.s3.us-east-1.amazonaws.com/AccordionRawPreview.gif)

The state management is quite straightforward, just a single `isCollapsed` to control the expand/collapse behavior.

## The Challenge of Customization

One key advantage of React component is reusability. However, the reusablity is meaningless without flexibility. Thus, in order to push the component to its full potential, let's customize it!

Considering following cases:

- Control the default expand/collapse behavior.
- Change the chevron icon.
- Apply custom styles to the title.
- Apply custom styles to the content.
- Execute a callback on collapse/expand.
- Make it a controlled component by explicitly passing state.
- Don't ask me why, I want the button on the left.

```tsx
import React from "react"
import accordionStyle from './accordion.module.css'
import { ChevronDown } from "./icon";

export default function Accordion({
    title,
    children,
    defaultOpen = false,
    triggerIcon,
    titleStyle = {},
    contentStyle = {},
    onTrigger,
    isCollapsed: isCollapsedOverride,
    triggerOnLeft = false,
}: {
    title?: string,
    children: React.ReactNode,
    defaultOpen?: boolean,
    triggerIcon?: React.ReactSVGElement,
    titleStyle?: React.CSSProperties,
    contentStyle?: React.CSSProperties,
    onTrigger?(isCollapsing: boolean): void,
    isCollapsed?: boolean,
    triggerOnLeft?: boolean,
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultOpen);

    if (triggerIcon) {
        const originalProps = triggerIcon.props;
        triggerIcon = React.cloneElement<{ className: string }, SVGSVGElement>(
            triggerIcon,
            {
                ...originalProps,
                className: `${accordionStyle.AccordionTrigger} ${triggerIcon.props.className}`
            });
    }
    else {
        triggerIcon = <ChevronDown className={accordionStyle.AccordionTrigger} /> as React.ReactSVGElement
    }

    return <div data-collapsed={isCollapsedOverride != undefined ? isCollapsedOverride : isCollapsed}
        className={accordionStyle.AccordionRoot}>
        <div className={accordionStyle.AccordionHeader} style={titleStyle}
            onClick={
                isCollapsedOverride != undefined ? undefined :
                    () => {
                        if (onTrigger != undefined) onTrigger(!isCollapsed);
                        setIsCollapsed(c => !c);
                    }
            }>
            {triggerOnLeft && triggerIcon}
            <h6>{title}</h6>
            {!triggerOnLeft && triggerIcon}
        </div>
        <div className={accordionStyle.AccordionContent} style={contentStyle}>
            <div className={accordionStyle.AccordionContentWrapper}>
                {children}
            </div>
        </div>
    </div>
}
```

When implementing the component in a monolithic pattern, exposing more arguments is a very common way to support more features. WHile this approach works, it introduces significant complexity indeed:

- **Parameter Explosion**: The component has an increasing number of properties.
- **Documentation Burden**: Using the component requires a thorough read of its documentation.
- **Rigidity**: Many layout and styles remain impossible due to the structure of the UI component.
- **Abstraction Leakage**: Developers have to understand its internal structure in some case, and will resort to inspecting the source code or using browser dev tools to figure out how to customize it properly.

## The Compound Pattern Solution: Break it Down!

The core functionality of accordion component is simple: using the `isCollapsed` state to connect the trigger and content container. The layout, styles, and custom hooks all comes later, while the monolithic implementation implies a lot more than that.

Putting pieces within same component is not the only solution of sharing states. Context API allows sharing states across different components by wrapping them inside a `context.Provider` wrapper. This would help us to break our monolithic accordion into discrete, composable pieces.

```tsx
import React from "react"

const AccordionContext = React.createContext<{
    isCollapsed: boolean,
    trigger(): void,
}>({
    isCollapsed: false,
    trigger: () => { }
});

function AccordionRoot({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = React.useState<boolean>(true);
    const trigger = () => setIsCollapsed(c => !c);

    return <AccordionContext.Provider value={{
        isCollapsed: isCollapsed, trigger: trigger
    }}>
        {children}
    </AccordionContext.Provider>
}

const AccordionTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionTrigger(props, ref) {
        const { isCollapsed, trigger } = React.useContext(AccordionContext);
        return <div {...props} ref={ref} onClick={trigger} data-collapsed={isCollapsed} />
    }
)

const AccordionHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionHeader(props, ref) {
        const { isCollapsed } = React.useContext(AccordionContext);
        return <div {...props} ref={ref} data-collapsed={isCollapsed} />
    }
)

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionContent(props, ref) {
        const { isCollapsed } = React.useContext(AccordionContext);
        return <div {...props} ref={ref} data-collapsed={isCollapsed} />
    }
)

export {
    AccordionRoot as Root,
    AccordionTrigger as Trigger,
    AccordionHeader as Header,
    AccordionContent as Content,
};
```

We end up with four components, the three visual component `Trigger`, `Header`,`Content` as mentioned previously, and an `Root` component which internally wrap children using `context.Provider` component.

Adding styles inside or outside of the component will be another dicussion. For this blog, let's enhance these with some default styles and additional functionality.

:::multi-codeblocks

```tsx filename=accordion.tsx
import React from "react"
import accordionStyle from './accordion.module.css'

const AccordionContext = React.createContext<{
    isCollapsed: boolean,
    trigger(): void,
}>({
    isCollapsed: false,
    trigger: () => { }
});

interface AccordionRootProps {
    defaultCollapsed?: boolean,
    isCollapsed?: boolean,   // the Accordion will become a controlled if this is provided.
    onCollapsed?(): void,
    onUncollapsed?(): void,
}

const AccordionRoot = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & AccordionRootProps>(
    function AccordionRoot({
        children, className, defaultCollapsed = false, isCollapsed: isCollapsedOverride, onCollapsed, onUncollapsed, ...other
    }, ref) {
        const [isCollapsed, setIsCollapsed] = React.useState<boolean>(defaultCollapsed);
        const onTrigger = () => {
            if (isCollapsed && onUncollapsed) onUncollapsed();
            else if (!isCollapsed && onCollapsed) onCollapsed();
            setIsCollapsed(c => !c)
        };

        return <AccordionContext.Provider value={{
            isCollapsed: isCollapsedOverride ?? isCollapsed,
            trigger: isCollapsedOverride == undefined ? onTrigger : () => { },
        }}>
            <div className={className ?? accordionStyle.AccordionRoot}
                data-collapsed={isCollapsed} ref={ref} {...other}>
                {children}
            </div>
        </AccordionContext.Provider>
    }
)

const AccordionTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionTrigger({ children, className, ...others }, ref) {
        const { trigger } = React.useContext(AccordionContext);
        return <div className={className ?? accordionStyle.AccordionTrigger}
            ref={ref} onClick={trigger} {...others}>
            {children}
        </div>
    }
)

const AccordionHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionHeader({ className, ...others }, ref) {
        return <div ref={ref}
            className={className ?? accordionStyle.AccordionHeader} {...others} />
    }
)

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionContent({ children, className, ...others }, ref) {
        return <div ref={ref} className={className ?? accordionStyle.AccordionContent} {...others}>
            {children}
        </div>
    }
)

export {
    AccordionRoot as Root,
    AccordionTrigger as Trigger,
    AccordionHeader as Header,
    AccordionContent as Content,
};
```

```css filename=accordion.module.css
.AccordionRoot {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border-radius: 4px;
    border: rgb(255 255 255 / 20%) 1px solid;
    overflow: hidden;
}

.AccordionHeader {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    padding: .15rem 0;
    margin: 1rem;
}

.AccordionContent {
    overflow-y: scroll;
    box-sizing: border-box;
    background-color: rgb(255 255 255 / 10%);
    border-radius: 4px;

    &::-webkit-scrollbar {
        display: none;
    }

    &[data-collapsed=false] {
        margin: 0 1rem 1rem 1rem;
        padding: 1rem;
        max-height: 15rem;
        opacity: 1;
        transition: all .2s linear,
            opacity .2s .2s linear;
    }

    &[data-collapsed=true] {
        margin: 0 1rem;
        padding: 0 1rem;
        max-height: 0;
        opacity: 0;
        transition: all .2s .2s linear,
            opacity .2s linear;
    }
}

.AccordionTrigger {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    transform: none;
    transition: background-color .2s linear;
    line-height: 0;
    border-radius: 4px;
    padding: .15rem 0.5rem;

    &:hover {
        background-color: rgb(255 255 255 / 10%);
    }
}
```

:::

Now the `Root` component accept properties related the `isCollapsed` state, such as a `isCollapsed` property to turn the component into a controlled version, and two optional callbacks `onCollapsed` and `onUncollapsed`.

All other pieces, `Trigger`, `Header`, `Content` accept all sets of `React.HTMLAttributes<HTMLDivElement>`.

## Using Compound Components

For usage, instead of using a single `Accordion` component with numerous porps, consumers compose UI from building blocks.

:::multi-codeblocks

```tsx filename=page.tsx
import * as Accordion from "@/components/accordion-compound-rich";
import { ChevronDown } from "@/components/icon";
import pageStyle from "./page.module.css";

export default function Home() {
  return (
      <Accordion.Root>
        <Accordion.Header>
          <h6>This is a Title</h6>
          <Accordion.Trigger>
            <ChevronDown className={pageStyle.AccordionRotateIcon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>
  );
}
```

```css filename=page.module.css
.AccordionRotateIcon {
    transition: transform .2s linear;

    [data-collapsed=true]>& {
        transform: rotate(180deg);
    }
}
```

:::

The power of compound component pattern becomes apparent when customization comes into play. And we apply all sets of properties to them just like treating native html element.

:::multi-codeblocks

```tsx filename=page.tsx
import * as Accordion from "@/components/accordion-compound-rich";
import { ArrowInput, ArrowOutput } from "@/components/icon";
import pageStyle from "./page.module.css";

export default function Home() {
  return (
      <Accordion.Root>
        <Accordion.Header>
          <div>
            <h6>This is a Title</h6>
            <p style={{ opacity: .5 }}>And customized Icon</p>
          </div>
          <Accordion.Trigger>
            <ArrowInput className={pageStyle.IconShowOnUncollapsed} />
            <ArrowOutput className={pageStyle.IconShowOnCollapsed} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>
  );
}
```

```css filename=page.module.css
.IconShowOnCollapsed {
    [data-collapsed=false]>& {
        display: none;
    }
}

.IconShowOnUncollapsed {
    [data-collapsed=true]>& {
        display: none;
    }
}
```

:::

![Accordion Variant](https://zane-portfolio.s3.us-east-1.amazonaws.com/AccordionVariant1Preview.gif)

:::multi-codeblocks

```tsx filename=page.tsx
import * as Accordion from "@/components/accordion-compound-rich";
import { ArrowInput, ArrowOutput } from "@/components/icon";
import pageStyle from "./page.module.css";

export default function Home() {
  return (
      <Accordion.Root>
        <Accordion.Header>
          <div>
            <h6>This is a Title</h6>
            <p style={{ opacity: .5 }}>And customized Icon</p>
          </div>
          <Accordion.Trigger>
            <ArrowInput className={pageStyle.IconShowOnUncollapsed} />
            <ArrowOutput className={pageStyle.IconShowOnCollapsed} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>
  );
}
```

```css filename=page.module.css
.AccordionRotateIcon {
    transition: transform .2s linear;

    [data-collapsed=true]>& {
        transform: rotate(180deg);
    }
}
```

:::

![Accordion Variant](https://zane-portfolio.s3.us-east-1.amazonaws.com/AccordionVariant2Preview.gif)

## Benefits and Challenges of Compound Component

By breaking down the mono-component into small pieces, we seperate the concerns, each piece has a focused and simple interface, and only in charge of one thing. It provides more flexibility on the consumer side to customize each piece of the component, while still maintain the functionality.

However it does bring some challenges, and some potential solution:

- **Initial learning curve**: However it's still more friendly when comparing to giant monolithic component.
- **Increased Lines of Code**: Breaking down component increase consumer efforts for sure. For bigger compound component, some composition utitility will be helpful for common patterns.
- **Messed up Structure**: User might place components in an unsupported hierachy. This can be solved by leveraging `useContext` hook to enforce the hierachy.
- **Extra DOM Elements**: May introduce redundant wrapper elements in some cases. The `asChild` property would allow the layer to become omre transparent.

## Conclusion

The compound component pattern represents a significant shift in how we build and consume UI components in React. While monolithic components are simpler to implement initially, they quickly become unwieldy when addressing real-world customization needs.

Compound components offer a more scalable and flexible alternative by breaking complex UI into logical, composable pieces.

As the React application or component library matures, transitioning from monolithic components to compound patterns might be a good choice. This approach may require slightly more code and introduce a small learning curve, but the gains in flexibility and maintainability are well worth the investment.