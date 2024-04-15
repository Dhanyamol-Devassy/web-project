const express = require('express');
const hbs = require('hbs');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Function to get the base URL based on environment
function getBaseUrl(req) {
    const isNetlify = process.env.NETLIFY === 'true';

    if (isNetlify) {
        // Use the default Netlify domain
        return `https://${process.env.DEPLOY_PRIME_URL}/`;
    } else {
        return 'http://localhost:3000'; // Use localhost for local development
    }
}


// Define routes

// Route for the home page
app.get('/', (req, res) => {
    res.render('index');
});

// Route for fetching all data
app.get('/alldata', (req, res) => {
    // Read the JSON file
    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Route for viewing data
app.get('/viewdata', (req, res) => {
    // Read the JSON file
    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading JSON file:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            const countries = jsonData.country.map(country => {
                let capital = "N/A"; // Default value for capital
                if (country['@capital']) {
                    capital = country['@capital'].split('-').pop(); // Extract city name from @capital
                }
                return {
                    name: country.name,
                    capital,
                    unemployment: country.unemployment,
                    gdpTotal: country.gdp_total // Assuming the total GDP is available in the gdp_total field
                };
            });

            res.render('alldata', { countries });
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Route for fetching holidays
app.get('/country/:countryName/holidays', async (req, res) => {
    const countryName = req.params.countryName;
    const year = req.query.year || new Date().getFullYear(); // Default to current year if no year is provided

    try {
        // Make a request to the holiday API for the specified country and year
        const response = await axios.get('https://holidays-by-api-ninjas.p.rapidapi.com/v1/holidays', {
            params: {
                country: countryName,
                year: year
            },
            headers: {
                'X-RapidAPI-Key': 'aab51485ccmsh9882fea0a2b9967p19bfb9jsn66cc732a240f',
                'X-RapidAPI-Host': 'holidays-by-api-ninjas.p.rapidapi.com'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching holidays for', countryName, 'and year', year, ':', error);
        res.status(500).send('Internal Server Error');
    }
});


// Route for population prediction
app.get('/country/:countryName/population', async (req, res) => {
    const countryName = req.params.countryName;
    const year = req.query.year;

    try {
        // Read the JSON file
        fs.readFile('./data.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading JSON file:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            try {
                const jsonData = JSON.parse(data);
                // Find the country in the JSON data
                const country = jsonData.country.find(country => country.name === countryName);
                if (!country) {
                    res.status(404).send('Country not found');
                    return;
                }
                // Find the population for the specified year
                const populationData = country.population.find(population => population['@year'] === year);
                if (!populationData) {
                    // Calculate predicted population based on population growth rate
                    const initialPopulation = parseInt(country.population[0]['#text']); // Assuming the initial population is available
                    const growthRate = parseFloat(country.population_growth);
                    const predictedPopulation = Math.round(initialPopulation * (1 + (growthRate / 100)) ** (parseInt(year) - parseInt(country.population[0]['@year'])));
                    
                    res.json({ population: predictedPopulation });
                    return;
                }
                // Population data found for the specified year
                res.json({ population: parseInt(populationData['#text']) });
            } catch (error) {
                console.error('Error parsing JSON data:', error);
                res.status(500).send('Internal Server Error');
            }
        });
    } catch (error) {
        console.error('Error predicting population for', countryName, ':', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});