import * as React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Trophy,
} from 'lucide-react';
import type { Match } from '@sundayleague/shared-types';
import { formatLeagueName } from '@/components/map/map-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { formatDisplayDate, formatKickoffTime } from '@/lib/date-utils';
import { formatDistance } from '@/lib/geo-utils';
import { useKioskQueue } from '@/lib/kiosk-submission-queue';
import { KioskInfoBadges } from './KioskInfoBadges';
import { useMatchDialog } from './MatchDialogContext';
import { MatchQuickActions } from './MatchQuickActions';
import { TopMatchBadge } from './TopMatchBadge';

export interface MatchTileProps {
  match: Match;
  variant?: 'card' | 'row';
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
}

export const MatchTile = React.forwardRef<HTMLDivElement, MatchTileProps>(
  (
    {
      match,
      variant = 'card',
      isSelected = false,
      isActive = false,
      onClick,
      onMouseEnter,
      className = '',
    },
    ref,
  ) => {
    const { openKioskModal } = useMatchDialog();
    const { hasPendingSubmission } = useKioskQueue();
    const hasPendingOffline = hasPendingSubmission(match.id);

    const isFinished = Boolean(match.result);
    const isFeatured = Boolean(match.isFeatured);
    const leagueName = formatLeagueName(match.leagueId, match.league?.name);
    const dateFormatted = formatDisplayDate(match.kickoffDate);
    const categoryParts = [match.league?.akName, match.league?.geschlecht].filter(Boolean);
    const effectiveKiosk = match.kioskDescription ?? match.venue?.kioskDescription;
    const effectiveParking = match.parkingNotes ?? match.venue?.parkingNotes;
    const kioskTeaser = effectiveKiosk ?? match.matchNotes;

    const hasKioskOrVenueInfo = Boolean(
      match.admissionFee?.trim() ||
        effectiveKiosk?.trim() ||
        effectiveParking?.trim() ||
        match.matchNotes?.trim() ||
        match.submitterName?.trim() ||
        match.submitterRole?.trim(),
    );

    const isSelectedOrActive = Boolean(isSelected || isActive);

    const handleOpenKioskModal = (e: React.MouseEvent) => {
      e.stopPropagation();
      openKioskModal(match);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    };

    // Row layout for VenueModal
    if (variant === 'row') {
      const rowStateClasses = isSelectedOrActive
        ? isFeatured
          ? 'border-amber-400 bg-amber-500/15 shadow-sm ring-1 ring-amber-400/50'
          : 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
        : isFeatured
          ? 'border-amber-500/70 bg-amber-500/10 hover:border-amber-400'
          : 'border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card';

      return (
        <div
          ref={ref}
          data-match-id={match.id}
          data-featured={isFeatured ? 'true' : undefined}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`cursor-pointer rounded-xl border p-3 text-xs transition-all ${rowStateClasses} ${className}`}
        >
          {/* Header: Badges & Kickoff Date/Time */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <TopMatchBadge
                match={match}
                size="sm"
              />

              {hasPendingOffline && (
                <Badge
                  variant="outline"
                  data-testid="kiosk-offline-pending-badge"
                  className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold"
                >
                  <Clock className="mr-1 h-2.5 w-2.5 shrink-0" />
                  Info ausstehend (Offline)
                </Badge>
              )}

              <Badge variant="league" className="text-[10px]">
                <Trophy className="mr-1 h-2.5 w-2.5" />
                {leagueName}
              </Badge>

              {categoryParts.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-muted/60">
                  {categoryParts.join(' • ')}
                </Badge>
              )}
            </div>

            <span className="font-mono text-[11px] font-semibold text-foreground">
              {dateFormatted} • {formatKickoffTime(match.kickoffTime)}
            </span>
          </div>

          {/* Teams Matchup */}
          <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-foreground">
            <span className="truncate">{match.homeTeam.name}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground font-normal">
              vs.
            </span>
            <span className="truncate text-right">{match.guestTeam.name}</span>
          </div>

          {match.result && (
            <div className="mt-1.5 text-right font-mono text-xs font-bold text-primary">
              Endstand: {match.result}
            </div>
          )}

          {/* Kiosk & Venue Info Badges */}
          {hasKioskOrVenueInfo && (
            <KioskInfoBadges
              match={match}
              size="sm"
              className="mt-2 border-t border-border/30 pt-2"
            />
          )}

          {kioskTeaser && !hasKioskOrVenueInfo && (
            <div
              data-testid="match-kiosk-teaser"
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-900 dark:text-amber-200"
            >
              <span className="shrink-0 leading-none" aria-hidden="true">
                🥨
              </span>
              <span className="truncate font-medium">{kioskTeaser}</span>
            </div>
          )}

          {/* Footer Actions: DBB Quick-Actions & Kiosk Submission Button */}
          <div className="mt-2.5 flex flex-col gap-2 border-t border-border/40 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                DBB Quick-Actions
              </span>

              <MatchQuickActions match={match} size="sm" />
            </div>

            <div className="flex items-center justify-end border-t border-border/25 pt-1.5">
              <button
                type="button"
                data-action="kiosk-submission"
                onClick={handleOpenKioskModal}
                onKeyDown={(e) => e.stopPropagation()}
                className="inline-flex h-6 items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
              >
                <span aria-hidden="true">🌭</span>
                <span>Kiosk- & Hallen-Info melden</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default 'card' layout for MatchList
    const cardStateClasses = isSelectedOrActive
      ? 'border-primary ring-2 ring-primary/40 bg-accent/25 shadow-md -translate-y-0.5'
      : isFeatured
        ? 'border-amber-500/80 ring-1 ring-amber-500/40 bg-linear-to-br from-amber-500/10 via-card to-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.18)] hover:border-amber-400 hover:shadow-[0_0_24px_rgba(245,158,11,0.28)]'
        : 'border-border/70 hover:border-primary/50 hover:bg-muted/20 hover:shadow-xs';

    return (
      <Card
        ref={ref}
        data-match-id={match.id}
        data-featured={isFeatured ? 'true' : undefined}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        tabIndex={0}
        role="button"
        onKeyDown={handleKeyDown}
        className={`cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${cardStateClasses} ${className}`}
      >
        <CardHeader className="pb-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <TopMatchBadge
                match={match}
                size="default"
              />

              {hasPendingOffline && (
                <Badge
                  variant="outline"
                  data-testid="kiosk-offline-pending-badge"
                  className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold"
                >
                  <Clock className="mr-1 h-2.5 w-2.5 shrink-0" />
                  Info ausstehend (Offline)
                </Badge>
              )}

              <Badge variant="league" className="text-[11px]">
                <Trophy className="mr-1 h-3 w-3" />
                {leagueName}
              </Badge>

              {categoryParts.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {categoryParts.join(' • ')}
                </Badge>
              )}

              <Badge variant="kickoff" className="text-[11px]">
                <Clock className="mr-1 h-3 w-3" />
                {formatKickoffTime(match.kickoffTime)}
              </Badge>

              <span className="font-mono text-[11px] text-muted-foreground">
                {match.matchDay}. Spieltag
              </span>
            </div>

            {/* Score Badge if finished or Confirmation Status Badge */}
            {isFinished ? (
              <Badge variant="secondary" className="font-mono font-bold text-primary text-xs">
                {match.result} {match.confirmed ? '(bestätigt)' : '(vorläufig)'}
              </Badge>
            ) : match.confirmed ? (
              <span className="flex items-center text-[10px] text-primary/80">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Bestätigt
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-bold text-base text-foreground leading-snug">
              {match.homeTeam.name}
            </span>
            <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
              vs.
            </span>
            <span className="font-bold text-base text-foreground text-right leading-snug">
              {match.guestTeam.name}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          {/* Venue and Distance info */}
          {match.venue && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate font-medium">{match.venue.name}</span>
                <span>•</span>
                <span>{match.venue.city}</span>
              </span>

              {match.distanceKm != null && (
                <span className="ml-2 shrink-0 font-mono text-[11px] font-semibold text-foreground">
                  {formatDistance(match.distanceKm)}
                </span>
              )}
            </div>
          )}

          {/* Kiosk and Venue Details Badges */}
          {hasKioskOrVenueInfo && <KioskInfoBadges match={match} />}

          {/* Kiosk Teaser Fallback banner */}
          {kioskTeaser && !hasKioskOrVenueInfo && (
            <div
              data-testid="match-kiosk-teaser"
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            >
              <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                🥨
              </span>
              <span className="truncate font-medium">{kioskTeaser}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 flex flex-col gap-2">
          <div className="w-full flex items-center justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Calendar className="h-3 w-3" />
              {dateFormatted}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-action="kiosk-submission"
                onClick={handleOpenKioskModal}
                onKeyDown={(e) => e.stopPropagation()}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
              >
                <span aria-hidden="true">🌭</span>
                <span>Kiosk- & Hallen-Info melden</span>
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                <Compass className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Auf Karte anzeigen</span>
                <span className="sm:hidden">Karte</span>
              </Button>
            </div>
          </div>

          <div className="w-full border-t border-border/20 pt-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              DBB Quick-Actions
            </span>

            <MatchQuickActions match={match} />
          </div>
        </CardFooter>
      </Card>
    );
  },
);

MatchTile.displayName = 'MatchTile';
