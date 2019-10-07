const utility = require('./utility');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');
const path    = require('path');
const init    = (process.env.INIT_DB === 'true');
const db      = new sqlite3.Database('./resource/data/city.list.db');

//------------------------------------------------------------------------------

/**
 * Downloads city.list.json from Open Weather Map
 */
async function downloadCityList(callback) {

  try {

    let url = "http://bulk.openweathermap.org/sample/city.list.json.gz";
    let dir = path.resolve(__dirname, 'resource/data/city.list.json.gz');
    let out = path.resolve(__dirname, 'resource/data/city.list.json');

    console.log(`Downloading city list from: ${url}`);

    await utility.download(dir, url);
    await utility.unzip(dir, out, callback);

  } catch (error) {

    utility.fatalError(error, utility.exitCodes.databaseSetupFailure);
  }
}

//------------------------------------------------------------------------------

/**
 * Initializes the SQLite3 database
 */
async function initDb() {

  let cityList = require('./resource/data/city.list.json');

  let dbError = (error, result) => {

    if (error) {

      utility.fatalError(error, utility.exitCodes.databaseSetupFailure);
    }
  }

  /**
   * Initializes the local database, by
   * Inserting all records from the city.list.json
   * file into the 'city' table
   */
  let create = () => {

    db.run("DROP TABLE IF EXISTS city;", dbError)
    db.run("CREATE TABLE IF NOT EXISTS city (id INT, name TEXT, country TEXT, lat REAL, lon REAL);", dbError);

    console.log(`Inserting ${cityList.length} cities into SQLite database`)

    let stmt = db.prepare("INSERT INTO city VALUES (?,?,?,?,?)", dbError);

    for (let i = 0; i < cityList.length; i++) {

      let city = cityList[i];

      stmt.run(
        city.id,
        city.name,
        city.country,
        city.coord.lat,
        city.coord.lon
      );
    }

    stmt.finalize( () => {

      // Set environment variable DB_READY to
      // true so that other functions (weather sync or async)
      // can check the value before attempting to make
      // calls the database
      process.env.DB_READY="true";

      console.log(
        "Successfully initialized local database. " +
        "It is now ready to be accessed."
      );
    });
  }

  db.serialize(create);
}

//------------------------------------------------------------------------------

/**
 * Sets up local SQLite3 database
 * of cities via city.list.json
 */
async function setup() {

  let init = async () => {

    try {

      await downloadCityList(initDb);

    } catch (e2) {

      utility.fatalError(e2, utility.exitCodes.databaseSetupFailure);
    }
  }

  /**
   * Checks that the 'city' table exists,
   * and that it has the same number of records
   * that the city.list.json has entries. If the
   * above statement is not met, the database is
   * reinitialized by re-downloaing the city.list.json
   * file and re-initilalizing the SQLite3 database.
   *
   * If the above statement is met, the database is
   * not reinitialized, and the environment variable
   * DB_READY is set to true so that when the dbQuery()
   * function is called it can confidently query the SQLite
   * database without running the risk of error.
   *
   * If re-initializing fails, then a fatal error has
   * occured, and execution terminates.
   */
  db.serialize( () => {

    let query = `SELECT name FROM sqlite_master WHERE type='table' AND name='city' LIMIT 1;`;

    // Check that the table city exists
    db.get(query, async (error, result) => {

      // Table does not exist
      if (error || !result || result.name != 'city') {

        console.log(
          "Local DB does not contain 'city' table " +
          "- initializing local database."
        );

        await init();

      // The table exists, now we must make sure
      // It contains the right amount of records
      } else {

        db.get("SELECT Count(*) FROM city;", async (error, result) => {

          try {

            let cityList = require('./resource/data/city.list.json');
            let count    = result['Count(*)'];

            // No match
            if (error || count !== cityList.length) {

              console.log(
                "Local DB record count and city.list.json length " +
                "do not match  - reinitializing local database."
              );

              await init();

            // Match. This means the table
            // has all the entrires (assuming they)
            // have not been altered
            } else {

              process.env.DB_READY="true";
            }

          } catch (e) {

            // Could not open city.list.json
            // so re-download and init
            if (e.code === 'MODULE_NOT_FOUND') {

              console.log(
                "Database present, but city.list.json "      +
                "is not available for cross-rerencinging - " +
                "reinitializing local database."
              );

              await init();

            // Otherwise, some other error
            // that we cannot recover from
            // has occured, so terminate execution
            } else {

              utility.fatalError(e, utility.exitCodes.databaseSetupFailure);
            }

          }

        });
      }
    });


  });

}

//------------------------------------------------------------------------------

/**
 * Runs a database query only if
 * the database is ready. Otherwise,
 * an error message is returned to client.
 */
async function dbQuery(res, callback) {

  if (process.env.DB_READY === 'true') {

      callback();

  } else {

    let error = new Error("Internal database not ready yet. Try again later.");

    utility.internalServerError(error, res, 503);
  }
}

//------------------------------------------------------------------------------

/**
 * Fetches city records similar to the
 * name that is being searched
 */
async function searchCityByName(name, res) {

  return dbQuery(res, () => {

    let query = `SELECT * FROM city WHERE name LIKE \"%${name}\%" LIMIT 25;`

    db.all(query, (error, rows) => {

      if (error) {

        utility.internalServerError(error, res);

      } else {

        res.send(rows || []);
      }
    });
  });

}

//------------------------------------------------------------------------------

module.exports = {

  setup            : setup,
  searchCityByName : searchCityByName
}
