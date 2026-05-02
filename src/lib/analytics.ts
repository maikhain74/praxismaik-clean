export type AnalyticsEventName =
  | 'page_view'
  | 'premium_cta_click'
  | 'premium_unlock'
  | 'exam_started'
  | 'exam_finished'
  | 'case_opened'
  | 'case_completed';

export type AnalyticsEventPayload = Record<string, string | number | boolean | null | undefined>;

type TrackEventInput = {
  name: AnalyticsEventName;
  payload?: AnalyticsEventPayload;
};

const ANALYTICS_ENABLED =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'true';

function isBrowser() {
  return typeof window !== 'undefined';
}

function cleanPayload(payload?: AnalyticsEventPayload) {
  if (!payload) return {};

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export function trackEvent({ name, payload }: TrackEventInput) {
  if (!isBrowser()) return;

  const finalPayload = cleanPayload(payload);

  if (!ANALYTICS_ENABLED) {
    console.log('[analytics disabled]', name, finalPayload);
    return;
  }

  console.log('[analytics live placeholder]', name, finalPayload);
}

export function trackPageView(path?: string) {
  trackEvent({
    name: 'page_view',
    payload: {
      path: path || (isBrowser() ? window.location.pathname : ''),
    },
  });
}

export function trackCaseOpened(slug: string, title?: string) {
  trackEvent({
    name: 'case_opened',
    payload: {
      slug,
      title,
    },
  });
}

export function trackCaseCompleted(slug: string, title?: string) {
  trackEvent({
    name: 'case_completed',
    payload: {
      slug,
      title,
    },
  });
}

export function trackExamStarted(quizId?: string) {
  trackEvent({
    name: 'exam_started',
    payload: {
      quizId,
    },
  });
}

export function trackExamFinished(score?: number, maxScore?: number) {
  trackEvent({
    name: 'exam_finished',
    payload: {
      score,
      maxScore,
    },
  });
}

export function trackPremiumCtaClick(location: string) {
  trackEvent({
    name: 'premium_cta_click',
    payload: {
      location,
    },
  });
}

export function trackPremiumUnlock(method: string = 'cookie') {
  trackEvent({
    name: 'premium_unlock',
    payload: {
      method,
    },
  });
}