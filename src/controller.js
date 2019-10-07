const service      = require('./service');
const utility      = require('./utility');
const iosAppId     = process.env.IOS_APP_ID;
const androidAppID = process.env.ANDROID_APP_ID;

//------------------------------------------------------------------------------

/**
 * Sets up dependencies (service)
 * then does any setup required for
 * the controller itself
 */
async function setup() {

  let callback = () => {

    let valid = true;

    // Insert setup code here
    if (!iosAppId) {

      console.error(
        "Could not determine iOS application id. "               +
        "Please make sure that the environment variable "        +
        "\"IOS_APP_ID\" is set. IOS_APP_ID: " + iosAppId  + ". " +
        "You may define it by running the followning command "   +
        "with the actual app id:\n\n"                            +
        "export IOS_APP_ID=replaceme\n"
      );

      valid = false;
    }

    if (!androidAppID) {

      console.error(
        "Could not determine Android application id. "                       +
        "Please make sure that the environment variable "                    +
        "\"ANDROID_APP_ID\" is set. ANDROID_APP_ID: " + androidAppID  + ". " +
        "You may define it by running the followning command "               +
        "with the actual app id:\n\n"                                        +
        "export ANDROID_APP_ID=replaceme\n"
      );

      valid = false;
    }

    if (!valid) {

      throw new Error("All app-id environment variables are not set");
    }

  }

  try {

    await service.setup().then(callback)

  } catch (error) {

    utility.fatalError(error, utility.exitCodes.controllerSetupFailure);
  }

}

//------------------------------------------------------------------------------

/**
 * Verifies the request
 * came from the iOS app
 */
function isApple(headers) {

  return headers['app-id'] === iosAppId
}

//------------------------------------------------------------------------------

/**
 * Verifies the request
 * came from the android app
 */
function isAndroid(headers) {

  return headers['app-id'] === androidAppID
}

//------------------------------------------------------------------------------

/**
 * Reads HTTP headers to verify that
 * the request is coming from the
 * an authorized device. If not, the
 * request will not be completed
 */
async function authenticate(req, res, next) {

  let authenticated = isApple(req.headers) || isAndroid(req.headers);

  console.log("Authenticating client")

  if (authenticated) {

    console.log("Client is authorized")

    return next()

  } else {

    let message = "Access denied. Client is not using an authorized application"
    let body    = {

      message : message
    }

    console.log(message)

    res.status(404)
    res.send(body)
  }

}

//------------------------------------------------------------------------------

/**
 * Makes HTTP GET request to /weather API
 * to get today's weather
 */
async function weather(req, res) {

  return service.apiCall(service.urls.weather + req._parsedUrl.query, res);
}

//------------------------------------------------------------------------------

/**
 * Makes HTTP GET request to /forecast API
 * to get 5 day weather forecast
 */
async function forecast(req, res) {

  return service.apiCall(service.urls.forecast + req._parsedUrl.query, res);
}

//------------------------------------------------------------------------------

/**
 * Searches for a city by name
 */
async function search(req, res) {

  return service.searchCityByName(req.query.city, res);
}

//------------------------------------------------------------------------------

/**
 * Gets images from Open Weather Map URL
 */
async function imgw(req, res) {

  let file = req._parsedUrl.path.split("/").pop() || "";

  return service.imgw(file, res);
}

//------------------------------------------------------------------------------

/**
 * Middleware for logging incoming
 * HTTP requests
 */
function log(req, res, next) {

  let msg = {

    date      : new Date(),
    client_ip : req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    method    : req.method,
    url       : req.url,
    host      : req.headers.host,
    agent     : req.headers['user-agent']
  };

  console.log(msg);

  return next();
}

//------------------------------------------------------------------------------

module.exports = {

  setup        : setup,
  authenticate : authenticate,
  imgw         : imgw,
  search       : search,
  weather      : weather,
  forecast     : forecast,
  log          : log
}
