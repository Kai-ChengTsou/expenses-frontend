function syncAppViewportHeight() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    if (!viewportHeight) return;
    document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
}

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(syncAppViewportHeight, 250);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewportHeight);
    window.visualViewport.addEventListener('scroll', syncAppViewportHeight);
}
