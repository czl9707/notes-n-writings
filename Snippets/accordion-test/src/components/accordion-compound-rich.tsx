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
            className={[accordionStyle.AccordionHeader, className].join(" ")} {...others} />
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