const url = require('url')
const sqlite3 = require('sqlite3').verbose() //verbose provides more detailed stack trace
const db = new sqlite3.Database('data/users')
const hbs = require('hbs');

// helper function to check if two values are equal, used in the hbs template
// Register the helper
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});
// In index.js (database setup)
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

db.serialize(() => {
  // Create table (if not exists)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      userid TEXT PRIMARY KEY, 
      password TEXT, 
      role TEXT
    )
  `);

  // Insert users with HASHED passwords
  db.run(
    "INSERT OR REPLACE INTO users VALUES (?, ?, ?)",
    ['u1', hashPassword('secret'), 'user']
  );
  db.run(
    "INSERT OR REPLACE INTO users VALUES (?, ?, ?)", 
    ['u2', hashPassword('secret2'), 'user']
  );
  db.run(
    "INSERT OR REPLACE INTO users VALUES (?, ?, ?)", 
    ['moe', hashPassword('secret3'), 'admin']
  );
});
exports.authenticate = function(request, response, next) {
  /*
	Middleware to do BASIC http 401 authentication
	*/
  var auth = request.headers.authorization
  // auth is a base64 representation of (username:password)
  //so we will need to decode the base64
  if (!auth) {
    //note here the setHeader must be before the writeHead
    response.setHeader('WWW-Authenticate', 'Basic realm="need to login"')
    response.writeHead(401, {
      'Content-Type': 'text/html'
    })
    console.log('No authorization found, send 401.')
    response.end()
  } else {
    console.log("Authorization Header: " + auth)
    //decode authorization header
    // Split on a space, the original auth
    //looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
    var tmp = auth.split(' ')

    // create a buffer and tell it the data coming in is base64
    var buf = Buffer.from(tmp[1], 'base64');

    // read it back out as a string
    //should look like 'ldnel:secret'
    var plain_auth = buf.toString()
    console.log("Decoded Authorization ", plain_auth)
    //extract the userid and password as separate strings
    var credentials = plain_auth.split(':') // split on a ':'
    var username = credentials[0]
    var password = credentials[1]
    console.log("User: ", username)
    console.log("Password: ", password)

    var authorized = false;
    //check database users table for user
    db.get(
      "SELECT role, password FROM users WHERE userid = ?",
      [username],
      (err, row) => {
          if (err || !row) {
              // User not found
              response.setHeader('WWW-Authenticate', 'Basic');
              response.writeHead(401).end();
              return;
          }

          // Hash the input password and compare with stored hash
          const inputHash = hashPassword(password);
          if (inputHash === row.password) {  // Now both are hashed
              request.user = {
                  role: row.role,
                  username: username
              };
              next();
          } else {
              response.setHeader('WWW-Authenticate', 'Basic');
              response.writeHead(401).end();
          }
      }
  );
  }
  //notice no call to next()
}

