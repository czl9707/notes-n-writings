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
            {children}
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

``` tsx
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

In order to share states across different components, `useState` won't be enough, `useContext` is introduced. And we end up with four components, the three visual component and an extra `Root` component to setup the context. 

Styling can be added either inside or outside of the component, based on different factors. I will just add them inside the component for simplicity of usage.

``` tsx
import React from "react"
import accordionStyle from './accordion-compound.module.css'


const AccordionContext = React.createContext<{
    isCollapsed: boolean,
    trigger(): void,
}>({
    isCollapsed: false,
    trigger: () => { }
});

interface AccordionRootProps {
    defaultCollapsed?: boolean,
    collapsed?: boolean
    isCollapsed?: boolean
}

const AccordionRoot = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & AccordionRootProps>(
    function AccordionRoot({ children, className, defaultCollapsed = false, isCollapsed: isCollapsedOverride, ...other }, ref) {
        const [isCollapsed, setIsCollapsed] = React.useState<boolean>(defaultCollapsed);
        const trigger = () => setIsCollapsed(c => !c);

        return <AccordionContext.Provider value={{
            isCollapsed: isCollapsedOverride ?? isCollapsed,
            trigger: isCollapsedOverride == undefined ? trigger : () => { },
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

Instead of using a single `Accordion` component, now consumer need to use building blocks from Accordion module to construct the bigger component.

```tsx
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

And we are also free from customizing layout and passing styles and properties on each component through parameters.

<!-- [Preview] -->
```tsx
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

<!-- [Preview] -->
```tsx
import * as Accordion from "@/components/accordion-compound-rich";
import { ArrowInput, ArrowOutput } from "@/components/icon";
import pageStyle from "./page.module.css";

export default function Home() {
  return (
      <Accordion.Root>
        <Accordion.Header>
          <Accordion.Trigger style={{ flex: "1 1" }}>
            <ChevronDown className={pageStyle.AccordionRotateIcon} />
            <h6>Title on the Right</h6>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>
  );
}
```

Have to say, it's a lot more LOC comparing to the mono-component solution, from both the component side and consumer side.

## Conclusion

Compound Components pattern help a lot