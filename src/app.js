const port       = process.env.WEATHER_API_PORT || 80;
const express    = require('express');
const controller = require('./controller');
const utility    = require('./utility');
const path       = require('path');
const timeout    = require('express-timeout-handler');
const app        = express();

//------------------------------------------------------------------------------

/**
 * Ensures we have a valid port
 * number to bind to, performs
 * setup of dependencies (controller)
 * then maps URL paths to appropriate
 * functions
 */
async function setup() {

  let callback = () => {

    if (!port || isNaN(port)) {

      throw new Error(
        "Environment variable \"WEATHER_API_PORT\" not set properly. "   +
        "Cannot bind a port. Port: " + port + ". You can set the port "  +
        "by running the following command in this terminal session:\n\n" +
        "export WEATHER_API_PORT=80\n"
      );
    }

    // Configure middleware
    app.use(
      timeout.handler(utility.timeoutOptions),
      controller.log,
      controller.authenticate
    );

    // REST endpoints
    app.get('/img/w/:file', controller.imgw);
    app.get('/forecast',    controller.forecast);
    app.get('/search',      controller.search);
    app.get('/weather',     controller.weather);

    // Serve static files
    app.use('/', express.static(path.join(__dirname, 'resource/static')));
  }

  try {

    await controller.setup().then(callback);

  } catch (error) {

    utility.fatalError(error, utility.exitCodes.applicationSetupFailure);
  }

}

//------------------------------------------------------------------------------

/**
 * Starts the Express app
 */
function run() {

  let callback = () => {

    console.log("Listening for connections on port " + port)
  }

  let onError = (error) => {

    // If the error was thrown as a
    // result of trying to bind the
    // node app to a port that is already
    // being used by another progam or
    // if the port is unavailable
    if (error.code === 'EACCES') {

      console.error(
        `Port \"${port}\" is already in use. ` +
        `Please set environment variable \"WEATHER_API_PORT\" ` +
        `to an available port`
      );
    }

    utility.fatalError(error, utility.exitCodes.applicationStartupFailure);
  }

  app.listen(port, callback).on('error', onError);

}

//------------------------------------------------------------------------------

setup().then(run)
