"use client"

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
        const { trigger, isCollapsed } = React.useContext(AccordionContext);
        return <div className={className ?? accordionStyle.AccordionTrigger}
            ref={ref} onClick={trigger} {...others} data-collapsed={isCollapsed}>
            {children}
        </div>
    }
)

const AccordionHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionHeader({ className, ...others }, ref) {
        const { isCollapsed } = React.useContext(AccordionContext);
        return <div ref={ref} data-collapsed={isCollapsed}
            className={className ?? accordionStyle.AccordionHeader} {...others} />
    }
)

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionContent({ children, className, ...others }, ref) {
        const { isCollapsed } = React.useContext(AccordionContext);
        return <div ref={ref} data-collapsed={isCollapsed}
            className={className ?? accordionStyle.AccordionContent} {...others}>
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