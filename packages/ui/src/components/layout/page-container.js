import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../../lib/utils';
const PageContainer = React.forwardRef(({ children, variant = 'standard', maxWidth = 'full', centered, className, ...props }, ref) => {
    // Auto-determine centered based on variant if not explicitly set
    const isCentered = centered !== undefined ? centered : (variant === 'standard' && maxWidth !== 'full');
    const paddingClasses = variant === 'standard' ? 'p-6' : 'p-0';
    const maxWidthClasses = {
        '4xl': 'max-w-4xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        'full': 'max-w-full'
    }[maxWidth];
    const centerClasses = isCentered ? 'mx-auto' : '';
    return (_jsx("div", { ref: ref, className: cn('w-full', paddingClasses, maxWidthClasses, centerClasses, className), ...props, children: children }));
});
PageContainer.displayName = 'PageContainer';
export { PageContainer };
