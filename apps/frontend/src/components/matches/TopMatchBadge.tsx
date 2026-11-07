import * as React from 'react';
import type { Match } from '@sundayleague/shared-types';
import { Badge } from '@/components/ui/badge';
import { useMatchDialog } from './MatchDialogContext';

export interface TopMatchBadgeProps {
  match: Match;
  className?: string;
  size?: 'sm' | 'default';
}

export function TopMatchBadge({
  match,
  className = '',
  size = 'default',
}: TopMatchBadgeProps) {
  const { openTopMatchModal } = useMatchDialog();

  if (!match.isFeatured) {
    return null;
  }

  const handleOpen = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    openTopMatchModal(match);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen(e);
    }
  };

  const sizeClasses = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <Badge
      variant="featured"
      data-testid="featured-match-badge"
      role="button"
      tabIndex={0}
      title="Topspiel-Details & Berechnungsgrundlage anzeigen"
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer hover:brightness-110 active:scale-95 transition-all select-none ${sizeClasses} ${className}`}
    >
      <span className="mr-1" aria-hidden="true">
        ⭐
      </span>
      Topspiel
    </Badge>
  );
}
