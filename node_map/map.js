// Assuming your site is served on GitHub Pages, we can't directly write to a CSV file from the browser.
// Instead, we'll use localStorage to store nodes and load them on page refresh.

const map = L.map('map').setView([35.4676, -97.5164], 8); // Default view for Oklahoma

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

const nodeForm = document.getElementById('nodeForm');
nodeForm.addEventListener('submit', addNode);

// Display current lat/lon on mouse move
const latLonDisplay = L.control({ position: 'bottomleft' });
latLonDisplay.onAdd = function () {
  const div = L.DomUtil.create('div', 'lat-lon-display');
  div.innerHTML = 'Lat: N/A, Lon: N/A';
  return div;
};
latLonDisplay.addTo(map);

map.on('mousemove', function (e) {
  document.querySelector('.lat-lon-display').innerHTML = `Lat: ${e.latlng.lat.toFixed(6)}, Lon: ${e.latlng.lng.toFixed(6)}`;
});

// Allow selecting a location by clicking on the map
map.on('click', function (e) {
  document.getElementById('latitude').value = e.latlng.lat.toFixed(6);
  document.getElementById('longitude').value = e.latlng.lng.toFixed(6);
});

// Load existing nodes from localStorage
var nodes = JSON.parse(localStorage.getItem('nodes')) || [];
nodes.forEach(node => addMarker(node));

function addMarker({ name, description, lat, lon, type }) {
  const colors = {
    Router: 'red',
    Repeater: 'blue',
    Client: 'green',
    Client_Mute: 'purple',
    Other: 'orange'
  };
  const marker = L.circleMarker([lat, lon], {
    color: colors[type] || 'gray',
    radius: 8,
  }).addTo(map);


  // Fetch the What3Words address
  fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lon}&key=EHAJSLPD`)
    .then(response => response.json())
    .then(data => {
      console.log('API Response:', data); // Log the response
      const w3wAddress = data.words || 'N/A';
      marker.bindPopup(`<b>${name}</b><br>${description}<br>Type: ${type}<br><b>What3Words:</b> ${w3wAddress}`);
    })
    .catch(() => {
      marker.bindPopup(`<b>${name}</b><br>${description}<br>Type: ${type}<br><b>What3Words:</b> Error fetching address`);
    });

 // marker.bindPopup(`<b>${name}</b><br>${description}<br>Type: ${type}`);
}

function addNode(e) {
  e.preventDefault();
  const name = document.getElementById('nodeName').value;
  const description = document.getElementById('description').value;
  const lat = parseFloat(document.getElementById('latitude').value);
  const lon = parseFloat(document.getElementById('longitude').value);
  const type = document.getElementById('nodeType').value;

  const newNode = { name, description, lat, lon, type };
  nodes.push(newNode);
  localStorage.setItem('nodes', JSON.stringify(nodes));

  addMarker(newNode);
  nodeForm.reset();
}

// Admin page functions
function loadAdminPage() {
  const adminContainer = document.getElementById('adminContainer');
  adminContainer.innerHTML = ''; // Clear existing content
  nodes = JSON.parse(localStorage.getItem('nodes')) || []; // Load nodes from localStorage
  nodes.forEach((node, index) => {
    const nodeItem = document.createElement('div');
    nodeItem.className = 'node-item';
    nodeItem.innerHTML = `
      <b>Name:</b> ${node.name} <br>
      <b>Description:</b> ${node.description} <br>
      <b>Latitude:</b> ${node.lat} <br>
      <b>Longitude:</b> ${node.lon} <br>
      <b>Type:</b> ${node.type} <br>
      <button class="edit-button" onclick="editNode(${index})">Edit</button>
      <button class="remove-button" onclick="removeNode(${index})">Remove</button>
    `;
    adminContainer.appendChild(nodeItem);
  });
}

function editNode(index) {
  const node = nodes[index];
  document.getElementById('nodeName').value = node.name;
  document.getElementById('description').value = node.description;
  document.getElementById('latitude').value = node.lat;
  document.getElementById('longitude').value = node.lon;
  document.getElementById('nodeType').value = node.type;
  nodes.splice(index, 1); // Remove the node to allow editing
  localStorage.setItem('nodes', JSON.stringify(nodes));
  loadAdminPage();
}

function removeNode(index) {
  nodes.splice(index, 1); // Remove the selected node
  localStorage.setItem('nodes', JSON.stringify(nodes)); // Save changes
  loadAdminPage();
}

// Initialize admin page
if (document.getElementById('adminContainer')) {
  loadAdminPage();
}
