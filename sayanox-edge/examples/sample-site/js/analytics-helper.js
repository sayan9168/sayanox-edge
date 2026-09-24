/**
 * Sayanox Sample Site — analytics-helper.js
 * Simulates a third-party helper script loaded without defer.
 */
(function () {
  'use strict';

  function trackPageView() {
    var payload = {
      page: window.location.pathname,
      ts: Date.now(),
      referrer: document.referrer || 'direct',
    };
    // In a real integration this would sendBeacon to an analytics endpoint.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/collect', JSON.stringify(payload));
    }
  }

  window.addEventListener('load', trackPageView);
})();
