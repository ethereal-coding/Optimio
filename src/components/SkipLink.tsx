/**
 * Skip Link Component
 * Allows keyboard users to skip navigation and jump to main content
 */

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /** ID of the target element to skip to */
  targetId: string;
  /** Custom link text */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skip to content link
 * 
 * This link is visually hidden but appears when focused (keyboard navigation)
 * Place this as the first focusable element in your layout
 * 
 * @example
 * ```tsx
 * <SkipLink targetId="main-content" />
 * <nav>...</nav>
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({ targetId, children = 'Skip to content', className }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'focus:z-50 focus:px-4 focus:py-2',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
}

interface SkipLinksProps {
  /** Array of skip link configurations */
  links: Array<{
    targetId: string;
    label: string;
  }>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Multiple skip links for complex layouts
 * 
 * @example
 * ```tsx
 * <SkipLinks
 *   links={[
 *     { targetId: 'main-content', label: 'Skip to main content' },
 *     { targetId: 'search', label: 'Skip to search' },
 *   ]}
 * />
 * ```
 */
export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <nav
      aria-label="Skip links"
      className={cn(
        'sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4',
        'focus-within:z-50 focus-within:p-4 focus-within:bg-background focus-within:rounded-md focus-within:shadow-lg',
        'focus-within:border focus-within:border-border',
        className
      )}
    >
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.targetId}>
            <SkipLink targetId={link.targetId}>{link.label}</SkipLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SkipLink;
