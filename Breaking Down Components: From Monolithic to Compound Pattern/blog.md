# Breaking Down Components: From Monolithic to Compound Pattern

React give us the capability of managing states within component, and it is almost always good to ensure states being capsulated within components. However, in reality, it is more than often that one functionality would require multiple pieces to accomplish.

Instead of putting everything related inside a single component (mono-component), compound component pattern seperate it into multiple components, and they work together to accomplish certain behavior.

## Build your own Accordion

Taking Accordion as an example, and let's break down what make up an Accordion:
- A Button to control the collapse behavior.
- A Box to display the title, visible all the time.
- A Box contain the collapsable content.

And Implement a minimal version of it.

``` tsx
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
            <div className={accordionStyle.AccordionContentWrapper}>
                {children}
            </div>
        </div>
    </div>
}
```

And state included in this component is quite simple, only one controling the collapse behavior.

### Customize it

As engineers, we almost always try to find a balance betwwen flexibility and simplicity. And needless to say, the component is extremely lean towards simplicity.

Considering following cases:
- Default open.
- Use another icon for trigger.
- Apply custom style to title.
- Apply custom style to content
- Invoke a custom hook on collapse.
- Collapse/Un-collapse it from outside of the component. 
- Don't ask me why, I want the trigger icon on the left.

I am a nice guy, so I am going to support all these customizing request. And the component code end up something like this.

``` tsx

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
    onCollapsed,
    isCollapsed: isCollapsedOverride,
    triggerOnLeft = false,
}: {
    title?: string,
    children: React.ReactNode,
    defaultOpen?: boolean,
    triggerIcon?: React.ReactSVGElement,
    titleStyle?: React.CSSProperties,
    contentStyle?: React.CSSProperties,
    onCollapsed?: (isCollapsed: boolean) => void,
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
                        if (onCollapsed != undefined) onCollapsed(!isCollapsed);
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

In order to expose more and more control of the internal pieces of the component, the number of parameters keeps growing. The trigger and title pieces are passed in as a `ReactNode`, which is [not recommanded]() by React team.

The purpose initiative of having this reusable accordion component to for simplicity. However as we require more flexiblity, we lose the simplicity. And at meantime, using this component require understanding of the internal structure of the component. I believe a lot of developers have either checked the source code, or using browser developer tools to investigate the structure of certain component. Which is against the capsulation aspect of a component.

### Seperate the Component

The core of accordion component is using the `isCollapsed` state to connect the trigger and content container. The layout, styles, and custom hooks all comes later. Lets extract that piece only.

``` ts
import React from "react"
import { ChevronDown } from "./icon";

export default function Accordion({ title, children }: {
    title?: string,
    children: React.ReactNode,
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return <div data-collapsed={isCollapsed} >
        {title}
        <ChevronDown onClick={() => setIsCollapsed(collapsed => !collapsed)} />
        <div>{children}</div>
    </div>
}
```

We put everything within the same component, since they share same state. We started with the idea of "one component" for simplicity, but ended up breaking the component abstraction layer. If we look at the the bone version of the component above, it still defined some layout, even if all styles has been removed.

To imply as little as possible, Why not try break the component into different piece? 

``` ts
```

In order to share states across different components, `useState` won't be enough, `useContext` is introduced. And we end up with four components, the three visual component and an extra `Root` component to setup the context. Instead of using a single `Accordion` component, now consumer need to use building blocks from Accordion module to construct the bigger component.

``` ts
```

Ignore styling, which can be added either inside or outside this component based the scale of the project and preferance. we are free from customizing layout and passing styles and properties on each component through parameters. We are able to use this component for any use case mentioned above, with a much cleaner component codebase. 

