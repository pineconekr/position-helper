window.dash_clientside = Object.assign({}, window.dash_clientside, {
    clientside: {
        updateBodyClass: function(isDark) {
            if (isDark) {
                document.body.classList.add('dark-theme-active');
            } else {
                document.body.classList.remove('dark-theme-active');
            }
            // Return value is not used, but Dash requires one
            // Returning no_update might be cleaner if available/working reliably
            return window.dash_clientside.no_update; 
        }
    }
}); 

// Auto-scroll the activity log to bottom whenever it updates or re-renders
(function attachActivityLogAutoScroll() {
  function attachTo(el) {
    if (!el || el.dataset.observed === '1') return;
    const scrollToBottom = () => { try { el.scrollTop = el.scrollHeight; } catch (e) {} };
    const observer = new MutationObserver(function() { requestAnimationFrame(scrollToBottom); });
    try {
      observer.observe(el, { childList: true, subtree: true });
      el.dataset.observed = '1';
      scrollToBottom();
    } catch (e) {}
  }

  function init() {
    // 초기 로드 시 한 번 시도
    attachTo(document.getElementById('team-activity-log-view'));

    // 이후 DOM 변동 시(탭 전환/재렌더) 요소가 생기면 자동으로 부착
    try {
      const rootObserver = new MutationObserver(function() {
        const el = document.getElementById('team-activity-log-view');
        if (el && el.dataset.observed !== '1') attachTo(el);
      });
      rootObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();