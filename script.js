// Keep track of the overlay's visibility state
let overlayVisible = true;

function toggleOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlayVisible) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    } else {
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
    }
    overlayVisible = !overlayVisible; // Toggle the state
}