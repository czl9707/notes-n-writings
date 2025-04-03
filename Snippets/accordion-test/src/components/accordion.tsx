"use client"

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