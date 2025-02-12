// loadContent.js
function loadHTML(elementId, filePath) {
    fetch(filePath)
        .then(response => response.text())
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
        })
        .catch(error => console.error(`Error loading ${filePath}:`, error));
}

// Load the header (repeat for footers or other sections if needed)
document.addEventListener("DOMContentLoaded", function() {
    loadHTML("meeting-placeholder", "/meeting.html");
});
