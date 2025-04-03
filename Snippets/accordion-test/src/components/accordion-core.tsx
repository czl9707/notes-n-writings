"use client"

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