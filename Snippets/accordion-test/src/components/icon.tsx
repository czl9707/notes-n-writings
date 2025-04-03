import React from "react";

export const ChevronDown = React.forwardRef<SVGSVGElement, React.SVGAttributes<SVGSVGElement>>(
    function ChevronDown({ ...props }, ref) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height={"2rem"} width={"2rem"}
                viewBox={"0 -960 960 960"} {...props} ref={ref}>
                <path d="M480-357.85 253.85-584 296-626.15l184 184 184-184L706.15-584 480-357.85Z" />
            </svg>
        );
    }
)
