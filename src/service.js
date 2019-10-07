const axios    = require('axios');
const database = require('./database');
const utility  = require('./utility');
const http     = require('http')
const apiUrl   = "https://api.openweathermap.org/data/2.5/"
const apiKey   = process.env.OPEN_WEATHER_API_KEY
const urls     = {

  weather  : apiUrl + "weather"  + "?APPID=" + apiKey + "&",
  forecast : apiUrl + "forecast" + "?APPID=" + apiKey + "&"
}

//------------------------------------------------------------------------------

/**
 * Makes a REST call to Open Weather API
 * to ensure that the API key is good and
 * we have access to the API
 */
async function setup() {

  let callback = async () => {

    await axios.get(urls.weather + "q=Chicago,us");

    console.log("API key is valid");
  }

  try {

    if (!apiKey) {

      throw new Error(
        "Could not establish successful connection with API. "                    +
        "Please ensure that the environment variable \"OPEN_WEATHER_API_KEY\" "   +
        "is properly set to the Open Weather API key. API key: " + apiKey + ". "  +
        "You may define it by running the following command in the terminal:\n\n" +
        "export OPEN_WEATHER_API_KEY=replaceme\n\n"                               +
        "Note: The above key must be replaced with your actual API key"
      );
    }

    await database.setup().then(callback);

  } catch (error) {

    utility.fatalError(error, utility.exitCodes.serviceSetupFailure);
  }
}

//------------------------------------------------------------------------------

/**
 * Makes HTTP GET request to Open Weather API
 */
async function apiCall(url, res) {

  console.log("HTTP GET - " + url)

  try {

    const response = await axios.get(url);

    console.log("HTTP GET successful")

    res.status(response.data.cod)
    res.send(response.data)

  } catch (error) {

    if (error.response) {

      let response = {}

      res.status(error.response.data.cod)
      response = error.response.data

      res.send(response)

    } else {

      utility.internalServerError(error, res);
    }
  }
}
//------------------------------------------------------------------------------

/**
 * Forwards image requests to openweathermap.org
 */
async function imgw(file, res) {

  try {

    let req = {

      method       : 'GET',
      url          : `http://openweathermap.org/img/w/${file}`,
      responseType : 'stream'
    };

    const response = await axios(req);

    response.data.pipe(res);

  } catch (error) {

    utility.internalServerError(error, res);
  }
}

//------------------------------------------------------------------------------

/**
 * Fetches city records similar to the
 * name that is being searched
 */
async function searchCityByName(name, res) {

  try {

    await database.searchCityByName(name, res);

  } catch (error) {

      utility.internalServerError(error, res);
  }

}

//------------------------------------------------------------------------------

module.exports = {

  setup            : setup,
  imgw             : imgw,
  urls             : urls,
  apiCall          : apiCall,
  searchCityByName : searchCityByName
}
