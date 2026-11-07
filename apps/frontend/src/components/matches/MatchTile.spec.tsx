import { renderToString } from 'react-dom/server';
import type { Match } from '@sundayleague/shared-types';
import { MatchTile } from './MatchTile';
import { TopMatchBadge } from './TopMatchBadge';
import {
  MatchDialogContext,
  MatchDialogProvider,
  useMatchDialog,
  useOnKioskSubmissionSuccess,
  type MatchDialogContextValue,
} from './MatchDialogContext';
import { RouterProvider } from '@/router';

const sampleMatch: Match = {
  id: 101,
  leagueId: 1,
  league: {
    id: 1,
    dbbId: 5001,
    name: 'Oberliga Württemberg',
    skName: 'Oberliga',
    akName: 'Senioren',
    geschlecht: 'männlich',
  },
  matchDay: 5,
  kickoffDate: '2099-10-25',
  kickoffTime: '18:00',
  homeTeam: { id: 10, dbbId: 1010, name: 'MTV Stuttgart 1843' },
  guestTeam: { id: 11, dbbId: 1011, name: 'SV Möhringen' },
  venue: {
    id: 501,
    name: 'Sporthalle West',
    street: 'Bebelstraße 24',
    postalCode: '70193',
    city: 'Stuttgart',
    latitude: 48.7745,
    longitude: 9.1565,
    kioskDescription: 'Waffeln, Kuchen & Kaffee',
  },
  admissionFee: 'Eintritt frei',
  result: null,
  confirmed: true,
  isFeatured: false,
  distanceKm: 2.1,
};

const featuredMatch: Match = {
  ...sampleMatch,
  id: 102,
  isFeatured: true,
  featuredReason: 'Spitzenspiel um Platz 1',
  featuredMeta: {
    type: 'algorithm',
    score: 92,
    factors: [
      { name: 'Tabelle', points: 30, description: 'Top 2 Duell' },
      { name: 'Derby', points: 25, description: 'Lokales Derby' },
    ],
  },
};

describe('MatchTile and TopMatchBadge Canonical Components', () => {
  describe('TopMatchBadge Component', () => {
    it('renders null when match is not featured', () => {
      const html = renderToString(<TopMatchBadge match={sampleMatch} />);

      expect(html).toBe('');
    });

    it('renders ⭐ Topspiel badge with data-testid="featured-match-badge" when match is featured', () => {
      const html = renderToString(<TopMatchBadge match={featuredMatch} />);

      expect(html).toContain('data-testid="featured-match-badge"');
      expect(html).toContain('⭐');
      expect(html).toContain('Topspiel');
    });

    it('dispatches openTopMatchModal via useMatchDialog when clicked', () => {
      let openedMatch: Match | null = null;

      const mockContext: MatchDialogContextValue = {
        openKioskModal: jest.fn(),
        openTopMatchModal: (m) => {
          openedMatch = m;
        },
        openReminderModal: jest.fn(),
        showToast: jest.fn(),
        isAnyDialogOpen: false,
        registerKioskSuccessListener: () => () => {},
      };

      const element = (
        <MatchDialogContext.Provider value={mockContext}>
          <TopMatchBadge match={featuredMatch} />
        </MatchDialogContext.Provider>
      );

      const html = renderToString(element);

      expect(html).toContain('data-testid="featured-match-badge"');

      mockContext.openTopMatchModal(featuredMatch);
      expect(openedMatch).toEqual(featuredMatch);
    });
  });

  describe('MatchTile Presentation Component', () => {
    it('renders variant="card" (default) with venue, distance and "Auf Karte anzeigen"', () => {
      const html = renderToString(<MatchTile match={sampleMatch} variant="card" />);

      // Match identity
      expect(html).toContain('data-match-id="101"');
      expect(html).toContain('MTV Stuttgart 1843');
      expect(html).toContain('SV Möhringen');

      // Venue information
      expect(html).toContain('Sporthalle West');
      expect(html).toContain('Stuttgart');
      expect(html).toContain('2.1 km');

      // Actions
      expect(html).toContain('Auf Karte anzeigen');
      expect(html).toContain('Kiosk- &amp; Hallen-Info melden');
      expect(html).toContain('DBB Quick-Actions');
    });

    it('renders variant="row" with compact layout without venue distance row or "Auf Karte anzeigen"', () => {
      const html = renderToString(<MatchTile match={sampleMatch} variant="row" />);

      // Match identity
      expect(html).toContain('data-match-id="101"');
      expect(html).toContain('MTV Stuttgart 1843');
      expect(html).toContain('SV Möhringen');

      // Row layout omits redundant venue and distance
      expect(html).not.toContain('2.1 km');
      expect(html).not.toContain('Auf Karte anzeigen');

      // Contains DBB Quick-Actions and kiosk report button
      expect(html).toContain('DBB Quick-Actions');
      expect(html).toContain('Kiosk- &amp; Hallen-Info melden');
    });

    it('renders TopMatchBadge and featured styling on featured matches for both card and row variants', () => {
      const cardHtml = renderToString(<MatchTile match={featuredMatch} variant="card" />);

      expect(cardHtml).toContain('data-featured="true"');
      expect(cardHtml).toContain('data-testid="featured-match-badge"');
      expect(cardHtml).toContain('Topspiel');

      const rowHtml = renderToString(<MatchTile match={featuredMatch} variant="row" />);

      expect(rowHtml).toContain('data-featured="true"');
      expect(rowHtml).toContain('data-testid="featured-match-badge"');
      expect(rowHtml).toContain('Topspiel');
    });

    it('applies isActive styling when active in row variant', () => {
      const activeHtml = renderToString(
        <MatchTile match={sampleMatch} variant="row" isActive={true} />
      );

      expect(activeHtml).toContain('border-primary');
    });
  });

  describe('MatchDialogContext & useMatchDialog Lifecycle Seam', () => {
    it('provides safe default no-op context when used outside MatchDialogProvider', () => {
      let captured: MatchDialogContextValue | undefined;

      function TestConsumer() {
        captured = useMatchDialog();

        return null;
      }

      renderToString(<TestConsumer />);

      expect(captured).toBeDefined();
      expect(captured?.isAnyDialogOpen).toBe(false);

      // Verify no-op dispatches do not throw
      expect(() => captured?.openKioskModal(sampleMatch)).not.toThrow();
      expect(() => captured?.openTopMatchModal(sampleMatch)).not.toThrow();
      expect(() => captured?.openReminderModal(sampleMatch)).not.toThrow();
      expect(() => captured?.showToast('Test')).not.toThrow();
      expect(() => captured?.registerKioskSuccessListener(() => {})()).not.toThrow();
    });

    it('useOnKioskSubmissionSuccess safely no-ops outside MatchDialogProvider', () => {
      const callback = jest.fn();

      function TestConsumer() {
        useOnKioskSubmissionSuccess(callback);

        return null;
      }

      expect(() => renderToString(<TestConsumer />)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('renders MatchDialogProvider with children and modals inside RouterProvider', () => {
      const html = renderToString(
        <RouterProvider initialPath="/">
          <MatchDialogProvider>
            <div data-testid="app-content-stub">Child App Content</div>
          </MatchDialogProvider>
        </RouterProvider>,
      );

      expect(html).toContain('data-testid="app-content-stub"');
      expect(html).toContain('Child App Content');
    });

    it('useOnKioskSubmissionSuccess notifies registered listeners', () => {
      let triggerSuccess: ((msg: string) => void) | undefined;
      let registeredCount = 0;

      const mockContext: MatchDialogContextValue = {
        openKioskModal: jest.fn(),
        openTopMatchModal: jest.fn(),
        openReminderModal: jest.fn(),
        showToast: jest.fn(),
        isAnyDialogOpen: false,
        registerKioskSuccessListener: (cb) => {
          registeredCount++;
          triggerSuccess = cb;

          return () => {
            registeredCount--;
          };
        },
      };

      const receivedMessages: string[] = [];

      // Manually trigger listener registration via mock context
      const unsubscribe = mockContext.registerKioskSuccessListener((msg) => {
        receivedMessages.push(msg);
      });

      expect(registeredCount).toBe(1);

      // Simulate kiosk submission success event
      triggerSuccess?.('Kiosk-Infos erfolgreich übermittelt!');

      expect(receivedMessages).toEqual(['Kiosk-Infos erfolgreich übermittelt!']);

      unsubscribe();
      expect(registeredCount).toBe(0);
    });
  });

  describe('TopMatchBadge Integration for Ticket / Detail View', () => {
    it('renders TopMatchBadge with size="sm" as used in MatchDetailView ticket header stub', () => {
      const badgeHtml = renderToString(<TopMatchBadge match={featuredMatch} size="sm" />);

      expect(badgeHtml).toContain('data-testid="featured-match-badge"');
      expect(badgeHtml).toContain('Topspiel');
      expect(badgeHtml).toContain('text-[10px]');
    });
  });
});
