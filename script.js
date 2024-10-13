let map;  // Declare the map globally so we can reinitialize it on year change
let geojsonLayer;  // Layer to hold the country data
let militaryData = {};  // Store processed data for easy access
let geojsonData;  // Store GeoJSON data globally for reuse

// Función para crear la leyenda de colores en el mapa
function addLegendToMap() {
    const legend = L.control({ position: 'bottomright' });  // Posicionamos la leyenda en la esquina inferior derecha

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend'),
              grades = [5000000000, 10000000000, 20000000000, 50000000000, 100000000000],  // Valores de referencia
              labels = [];

        // Creamos un encabezado para la leyenda
        div.innerHTML += '<strong>Percentage of GDP used for Military Expenditure</strong><br>';

        // Recorremos los intervalos y generamos una etiqueta con un bloque de color para cada rango
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '; width: 18px; height: 18px; display: inline-block;"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }

        return div;
    };

    legend.addTo(map);  // Añadimos la leyenda al mapa
}

function initializeMap() {
    map = L.map('map').setView([20, 0], 2);  // Center the map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    addLegendToMap();  // Añadir la leyenda justo después de crear el mapa
}

// Load GeoJSON and CSV data, then initialize the map
function loadData() {
    d3.json('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json').then(data => {
        geojsonData = data;  // Store the GeoJSON data
        Promise.all([
            d3.csv('Countries GDP 1960-2020.csv'),  // Cargamos el PIB pero no lo usamos en este ejemplo
            d3.csv('Military Expenditure.csv')
        ]).then(([gdpData, milExpenditureData]) => {
            militaryData = processMilitaryExpenditureData(milExpenditureData);

            createMap(geojsonData, 2020);  // Initially display data for 2020
        });
    });
}

// Process data to calculate military expenditure for all years
function processMilitaryExpenditureData(milExpenditureData) {
    const countryNameMapping = {
        "United States": "United States of America",
        "Russian Federation": "Russia",
        "Venezuela (Bolivarian Republic of)": "Venezuela",
        "Congo, Dem. Rep.": "Democratic Republic of the Congo",
        "Congo, Rep.": "Republic of the Congo",
        "Cote d'Ivoire": "Ivory Coast",
    };

    const militaryExpenditureData = {};

    milExpenditureData.forEach(milRow => {
        let country = milRow["Name"];
        if (countryNameMapping[country]) {
            country = countryNameMapping[country];  // Standardize country name
        }

        // Initialize military data object for each country
        militaryExpenditureData[country] = {};

        // Process military expenditure data for each year
        for (let year = 1960; year <= 2020; year++) {
            const militaryExpenditure = milRow[year];
            militaryExpenditureData[country][year] = militaryExpenditure ? +militaryExpenditure : null;
        }
    });

    console.log("Processed Military Expenditure Data: ", militaryExpenditureData);  // Log processed data
    return militaryExpenditureData;
}

// Create the map based on the selected year
function createMap(geojsonData, year) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);  // Remove the existing layer before adding a new one
    }

    geojsonLayer = L.geoJson(geojsonData, {
        style: feature => {
            const country = feature.properties.name;
            const expenditure = militaryData[country] && militaryData[country][year] 
                                ? militaryData[country][year] 
                                : null;

            return {
                fillColor: expenditure ? getColor(expenditure) : '#ccc',
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7,
                transition: 'fill-opacity 0.5s ease' // Transiciones suaves
            };
        },
        onEachFeature: (feature, layer) => {
            const country = feature.properties.name;
            const expenditure = militaryData[country] && militaryData[country][year] 
                                ? militaryData[country][year] 
                                : 'No data';

            layer.bindTooltip(`<strong>${country}</strong><br>Military Expenditure: ${expenditure}`);

            // Manejar evento click para mostrar más información
            layer.on('click', function() {
                showCountryDetails(country, year);
            });
        }
    }).addTo(map);
}

// Function to get color based on military expenditure amount
function getColor(expenditure) {
    return expenditure > 100000000000 ? '#800026' :
           expenditure > 50000000000  ? '#BD0026' :
           expenditure > 20000000000  ? '#E31A1C' :
           expenditure > 10000000000  ? '#FC4E2A' :
           expenditure > 5000000000   ? '#FD8D3C' :
                                        '#FFEDA0';
}

// Event listener for year range slider
document.getElementById('yearRange').addEventListener('input', function() {
    const year = this.value;
    document.getElementById('yearLabel').innerText = year;
    createMap(geojsonData, year);  // Update map based on the selected year
});

// Initialize the map and load data
initializeMap();
loadData();
