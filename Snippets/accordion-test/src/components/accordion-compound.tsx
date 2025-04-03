"use client"

import React from "react"

const AccordionContext = React.createContext<{
    isCollapsed: boolean,
    trigger(): void,
}>({
    isCollapsed: false,
    trigger: () => { }
});

const AccordionRoot = ({ defaultCollapsed, children }: {
    defaultCollapsed: boolean,
    children: React.ReactNode,
}) => {
    const [isCollapsed, setIsCollapsed] = React.useState<boolean>(defaultCollapsed);
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

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function AccordionContent(props, ref) {
        const { isCollapsed } = React.useContext(AccordionContext);
        return <div {...props} ref={ref} data-collapsed={isCollapsed} />
    }
)

export {
    AccordionRoot as Root,
    AccordionTrigger as Trigger,
    AccordionContent as Content,
};