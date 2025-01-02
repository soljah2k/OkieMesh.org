function toggleOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay.style.opacity === '1') {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    } else {
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
    }
}