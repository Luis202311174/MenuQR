export type CustomerBehaviorEvent = {
  type: string;
  timestamp: string;
  payload: Record<string, any>;
};

export type CustomerBehaviorPayload = {
  metadata: {
    sessionId: string;
    tableId?: string;
    businessId?: string;
    scanTimestamp: string;
    scanUrl: string;
    deviceInfo: {
      userAgent: string;
      browser: string;
      os: string;
      device: string;
      isMobile: boolean;
      isSocialBrowser: boolean;
    };
    sessionStart: string;
    firstInteractionAt: string;
    lastInteractionAt: string;
    maxScrollPercent: number;
  };
  events: CustomerBehaviorEvent[];
};

const STORAGE_KEY_PREFIX = "customer_behavior_events_";

const getStorageKey = (sessionId: string) => `${STORAGE_KEY_PREFIX}${sessionId}`;

function normalizeUserAgent(userAgent: string) {
  const ua = userAgent || "";
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const browser = /CriOS|Chrome/i.test(ua)
    ? "Chrome"
    : /Safari/i.test(ua)
    ? "Safari"
    : /Firefox/i.test(ua)
    ? "Firefox"
    : /Edg\//i.test(ua)
    ? "Edge"
    : /OPR|Opera/i.test(ua)
    ? "Opera"
    : "Other";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Windows/i.test(ua)
    ? "Windows"
    : /Macintosh/i.test(ua)
    ? "macOS"
    : /Linux/i.test(ua)
    ? "Linux"
    : "Other";
  const isSocialBrowser = /FBAV|FBAN|Instagram|Line|Messenger|Twitter|Snapchat|TikTok|WeChat|WhatsApp/i.test(ua);
  const device = isMobile ? "Mobile" : "Desktop";

  return {
    userAgent: ua,
    browser,
    os,
    device,
    isMobile,
    isSocialBrowser,
  };
}

export class CustomerBehaviorTracker {
  sessionId: string;
  tableId?: string;
  businessId?: string;
  metadata: CustomerBehaviorPayload["metadata"];
  events: CustomerBehaviorEvent[] = [];
  private idleTimerId: number | null = null;
  private scrollHandler: (() => void) | null = null;
  private lastScrollPercentLogged = 0;

  constructor({
    sessionId,
    tableId,
    businessId,
  }: {
    sessionId: string;
    tableId?: string;
    businessId?: string;
  }) {
    this.sessionId = sessionId;
    this.tableId = tableId;
    this.businessId = businessId;
    this.metadata = {
      sessionId,
      tableId,
      businessId,
      scanTimestamp: new Date().toISOString(),
      scanUrl: typeof window !== "undefined" ? window.location.href : "",
      deviceInfo: normalizeUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : ""),
      sessionStart: new Date().toISOString(),
      firstInteractionAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
      maxScrollPercent: 0,
    };
  }

  init() {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(getStorageKey(this.sessionId));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CustomerBehaviorPayload;
        if (parsed?.metadata?.sessionId === this.sessionId) {
          this.metadata = {
            ...this.metadata,
            ...parsed.metadata,
            scanTimestamp: parsed.metadata.scanTimestamp || this.metadata.scanTimestamp,
            firstInteractionAt: parsed.metadata.firstInteractionAt || this.metadata.firstInteractionAt,
          };
          this.events = parsed.events || [];
        }
      } catch {
        // ignore invalid storage
      }
    }

    this.persist();
  }

  logEvent(type: string, payload: Record<string, any> = {}) {
    const timestamp = new Date().toISOString();
    this.metadata.lastInteractionAt = timestamp;
    if (!this.metadata.firstInteractionAt) {
      this.metadata.firstInteractionAt = timestamp;
    }

    const event: CustomerBehaviorEvent = {
      type,
      timestamp,
      payload,
    };

    this.events.push(event);
    this.persist();
  }

  logIdlePeriod(durationMs: number) {
    this.logEvent("idle_period", { durationMs });
  }

  updateScrollDepth(scrollPercent: number) {
    if (scrollPercent <= this.metadata.maxScrollPercent) return;
    if (scrollPercent - this.lastScrollPercentLogged < 5) return;

    this.metadata.maxScrollPercent = scrollPercent;
    this.lastScrollPercentLogged = scrollPercent;
    this.logEvent("scroll_depth", { scrollPercent });
  }

  getPayload(): CustomerBehaviorPayload {
    return {
      metadata: this.metadata,
      events: this.events,
    };
  }

  persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        getStorageKey(this.sessionId),
        JSON.stringify(this.getPayload()),
      );
    } catch {
      // ignore local storage failures
    }
  }

  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(getStorageKey(this.sessionId));
    this.events = [];
  }

  startScrollTracking() {
    if (typeof window === "undefined" || this.scrollHandler) return;

    this.scrollHandler = () => {
      const scrollTop = window.scrollY || window.pageYOffset;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight,
      );
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const percent = Math.min(100, Math.round(((scrollTop + viewportHeight) / docHeight) * 100));
      this.updateScrollDepth(percent);
    };

    window.addEventListener("scroll", this.scrollHandler, { passive: true });
  }

  stopScrollTracking() {
    if (typeof window === "undefined" || !this.scrollHandler) return;
    window.removeEventListener("scroll", this.scrollHandler);
    this.scrollHandler = null;
  }

  startIdleMonitor(idleThresholdMs = 60000) {
    if (typeof window === "undefined" || this.idleTimerId !== null) return;
    this.idleTimerId = window.setInterval(() => {
      const last = new Date(this.metadata.lastInteractionAt).getTime();
      const now = Date.now();
      const idleMs = now - last;
      if (idleMs >= idleThresholdMs) {
        this.logIdlePeriod(idleMs);
      }
    }, Math.max(10000, Math.min(idleThresholdMs / 2, 30000)));
  }

  stopIdleMonitor() {
    if (this.idleTimerId !== null) {
      window.clearInterval(this.idleTimerId);
      this.idleTimerId = null;
    }
  }

  stop() {
    this.stopScrollTracking();
    this.stopIdleMonitor();
    this.persist();
  }
}
