let map;  // Declare the map globally so we can reinitialize it on year change
let geojsonLayer;  // Layer to hold the country data
let militaryData = {};  // Store processed data for easy access
let geojsonData;  // Store GeoJSON data globally for reuse

// Initialize the map
function initializeMap() {
    map = L.map('map').setView([20, 0], 2);  // Center the map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Load GeoJSON and CSV data, then initialize the map
function loadData() {
    d3.json('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json').then(data => {
        geojsonData = data;  // Store the GeoJSON data
        Promise.all([
            d3.csv('Countries GDP 1960-2020.csv'),  // We load GDP but don't use it
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

            // Log each country data for debugging
            console.log(`Country: ${country}, Expenditure for ${year}: `, expenditure);

            return {
                fillColor: expenditure ? getColor(expenditure) : '#ccc',
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: (feature, layer) => {
            const country = feature.properties.name;
            const expenditure = militaryData[country] && militaryData[country][year] 
                                ? militaryData[country][year] 
                                : 'No data';

            layer.bindTooltip(`<strong>${country}</strong><br>Military Expenditure: ${expenditure}`);
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
