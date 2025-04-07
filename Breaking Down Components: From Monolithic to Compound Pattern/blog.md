# Breaking Down Components: From Monolithic to Compound Pattern

React give us the capability of managing states within component, and it is almost always good to ensure states being capsulated within components. However, in reality, it is more than often that one functionality would require multiple pieces to accomplish.

We usually put everything related inside a single component, and lift all share states into it, and call it "a component". Instead, compound component pattern seperate the concerns, by breaking it into multiple pieces, and let them communicate in the background to accomplish certain behavior. A lot of famous component library leverage compound component pattern, such as [Radix Primitive](https://www.radix-ui.com/primitives) and [Shadcn/ui](https://ui.shadcn.com/).

## Build your own Accordion

Taking Accordion as an example, and let's break down what make up an Accordion:
- A Button to control the collapse behavior.
- A Box to display the title, visible all the time.
- A Box contain the collapsable content.

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
A minimal version of accordion. The state included in this component is quite straight forward, only the `isCollapsed` to control the collapse behavior.

### Customize it

One biggest advantage of component is its reusability. However, the reusablity is useless if missing flexibility. Thus, in order to push the component to its full potential, let's customize it!

Considering following cases:
- Control the default openness.
- Use another icon for accordion button.
- Apply custom style to title.
- Apply custom style to content
- Invoke a custom hook on collapse.
- Make it a controlled component by passing in the collapse state.
- Don't ask me why, I want the button on the left.

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

When implementing the component in a monolithic pattern, exposing more arguments is a very common way to support more features. Since the component capsulates child pieces, it also expose control of them through argument drilling, which easily leads to a huge amount of arguments.

Now, using the component would require a thorough read of its documentation. And some level of understanding of its internal structure would be a must, if want to heavily customize its internal pieces. I believe a lot of developers have either checked the source code, or used browser developer tools to inspect the structure of certain component at some moment. 

### Break it down!

Logically, the core of accordion component is using the `isCollapsed` state to connect the trigger and content container. The layout, styles, and custom hooks all comes later. The monolithic implementation implies a lot more than that.  

Putting pieces within same component is not the only way of sharing states. Context API allows states sharing across different components by wrapping them inside a `context.Provider` component, which would rescue us from this situation.

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

We end up with four components, the three visual component and an `Root` component which internally wrap children using `context.Provider` component. 

Adding styles inside or outside of the component will be another dicussion. For this blog, I will just add them inside the component for simplicity of usage.

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

Now the `Root` component support a `isCollapsed` property to turn the component into a controlled version, and two optional hooks `onCollapsed` and `onUncollapsed`. 

For usage, instead of using a single `Accordion` component, now consumer need to use building blocks from Accordion module to construct the bigger component.

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

And we are also free from customizing layout and passing styles and properties on each component through properties.

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
<!-- Insert [Preview] -->

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
        <h6 style={{ opacity: .5, margin: "1rem", textAlign: "end" }}>Something in the middle</h6>
        <Accordion.Content>
          Lorem ipsum dolor sit amet, summo dicant mnesarchum eum an, eu mea alii facilisis. Sed brute vocent suscipit ad, in cum dicant moderatius. Audiam copiosae liberavisse id eos, natum elitr iisque eu has. Est ut partem possim alienum, nec no malis singulis. In quem minimum pro, ne vero errem indoctum pro. Iisque scripta consectetuer at vis, ei has dicta simul deleniti, sea consul postulant torquatos at.
        </Accordion.Content>
      </Accordion.Root>
  );
}
```
<!-- Insert [Preview] -->

By breaking down the mono-component into small pieces, and using compound component pattern, we provided more flexibility on the consumer side to customize each piece of the component, while still maintain the functionality. 

However, it does increase the lines of code, both in component and in consumer side, slightly increasing the learning curve. The current implementation also introduces more challenges:
- User might use components in a wrong order.
- introducing redundent `div` layers in some cases.

We can solve these problem by:
- Enforcing components order by taking advantage of `useContext` hook.
- Add a `asChild` parameter, which allow component to become more transparent.

## Conclusion

Compound Components pattern reduces the complexity of parameters and internal logic of components, by exposing the inner piece of a component. It allows users to compose different pieces together to have them work together, and provicdes cleaner interface on each component, but do slightly increase the learning curve when using it.