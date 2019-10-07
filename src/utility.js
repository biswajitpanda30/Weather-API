const exitCodes      = require('./resource/data/error.codes.json');
const resLimit       = parseInt(process.env.RESPONSE_TIME_LIMIT ) || 120000;
const fs             = require('fs')
const path           = require('path')
const axios          = require('axios')
const gunzip         = require('gunzip-file')
const timeoutOptions = {

  // https://www.npmjs.com/package/express-timeout-handler

  timeout: resLimit,

  onTimeout: (req, res) => {

    internalServerError(
      new Error('Request timed out. Try again later.'),
      res, 503
    );
  },

  onDelayedResponse: (req, method, args, requestTime) => {

    console.error(
      `Attempted to call ${method} after timeout.\n` +
      `Request time: ${requestTime} ms\n` +
      `Time limit: ${resLimit} ms`
    );
  },

  disable: ['write', 'setHeaders', 'send', 'json', 'end']
};

//------------------------------------------------------------------------------

/**
 * Unzips .gz files
 */
async function unzip(input, output, callback) {

  console.log(`Unzipping \"${input}\" to \"${output}\"`);

  gunzip(input, output, () => {

    console.log("Unzip complete");

    if (callback) {

      callback();
    }
  });

}

//------------------------------------------------------------------------------

/**
 * Downloads a file into a local directory
 */
async function download(dir, url) {

  console.log("Downloading file: " + url);

  const req = {
    method: 'GET',
    url: url,
    responseType: 'stream'
  };

  const response = await axios(req);

  response.data.pipe(fs.createWriteStream(dir));

  return new Promise( (resolve, reject) => {

    response.data.on('end', () => {
      console.log("Download complete, saving as: " + dir);
      resolve();
    });

    response.data.on('error', () => {
      reject();
    });
  })

}

//------------------------------------------------------------------------------

/**
 * Logs a fatal error and kills
 * the process
 */
function fatalError(error, exitCode) {

  console.error(error);
  process.exit(exitCode || 6);
}

//------------------------------------------------------------------------------

/**
 * Sends generic internal server error
 * message back to client. This is a last
 * resort to avoid unresolved rejected promises
 */
function internalServerError(error, res, code) {

  let body = {

    message : error.message || "Unknown error occured, please contact administrator",
    errorno : error.errno,
    code    : error.code
  }

  console.error(body);

  res.status(code || 500);
  res.send(body);
}

//------------------------------------------------------------------------------

module.exports = {

  unzip      : unzip,
  download   : download,
  exitCodes  : exitCodes,
  fatalError : fatalError,
  timeoutOptions      : timeoutOptions,
  internalServerError : internalServerError
}
