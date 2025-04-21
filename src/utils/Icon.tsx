import React from 'react';
import type { IconBaseProps } from 'react-icons';

/**
 * wrapIcon: wrap a react-icons component to ensure it returns a valid ReactElement
 * preserving props and avoiding ReactNode return type issues.
 *
 * @param RawIcon - the original icon component from react-icons
 * @returns a React.FC that renders the icon with given props
 */
export function wrapIcon(
  RawIcon: (props: IconBaseProps) => React.ReactNode
): React.FC<IconBaseProps> {
  const WrappedIcon: React.FC<IconBaseProps> = (props) =>
    // React.createElement ensures output is ReactElement
    React.createElement(RawIcon as any, props);
  return WrappedIcon;
}