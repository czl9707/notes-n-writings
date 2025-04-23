import * as React from 'react'
import clsx from 'clsx';
import buttonStyle from './Button.module.css';

function Button({ lable, onClick }: {
    lable: string,
    onClick?(): void,
}) {
    return <div onClick={onClick} className={buttonStyle.Button}>
        <p>{lable}</p>
    </div>
}

function HoverContext({ children }: { children: React.ReactElement<{ className: string }> }) {
    const originalProps = children.props;
    return React.cloneElement(
        children,
        {
            ...originalProps,
            className: clsx(originalProps.className, buttonStyle.HoverContext)
        }
    );
}

Button.HoverContext = HoverContext;
export default Button;