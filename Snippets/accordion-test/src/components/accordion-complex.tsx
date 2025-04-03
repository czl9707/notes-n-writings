"use client"

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