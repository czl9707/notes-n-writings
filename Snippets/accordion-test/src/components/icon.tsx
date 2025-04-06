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


export const ArrowInput = React.forwardRef<SVGSVGElement, React.SVGAttributes<SVGSVGElement>>(
    function ArrowInput({ ...props }, ref) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height={"2rem"} width={"2rem"}
                viewBox={"0 -960 960 960"} {...props} ref={ref}>
                <path d="m156-100-56-56 124-124H120v-80h240v240h-80v-104L156-100Zm648 0L680-224v104h-80v-240h240v80H736l124 124-56 56ZM120-600v-80h104L100-804l56-56 124 124v-104h80v240H120Zm480 0v-240h80v104l124-124 56 56-124 124h104v80H600ZM480-400q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z" />
            </svg>
        );
    }
)


export const ArrowOutput = React.forwardRef<SVGSVGElement, React.SVGAttributes<SVGSVGElement>>(
    function ArrowOutput({ ...props }, ref) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height={"2rem"} width={"2rem"}
                viewBox={"0 -960 960 960"} {...props} ref={ref}>
                <path d="M120-120v-240h80v104l124-124 56 56-124 124h104v80H120Zm480 0v-80h104L580-324l56-56 124 124v-104h80v240H600ZM324-580 200-704v104h-80v-240h240v80H256l124 124-56 56Zm312 0-56-56 124-124H600v-80h240v240h-80v-104L636-580ZM480-400q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z" />
            </svg>
        );
    }
)
