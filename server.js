const express = require('express');
const https = require('https');
const path = require('path');
const hbs = require('hbs');
const routes = require('./routes/index'); 
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/users');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const port = 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());  // For parsing application/json
// Set up hbs as the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('view options', { layout: 'main' });

app.use(routes.authenticate); //authenticate user
// Home route - now fetches currencies first
app.get('/', (req, res) => {
    const currenciesUrl = 'https://api.frankfurter.app/currencies';
    
    https.get(currenciesUrl, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => data += chunk);
      apiRes.on('end', () => {
        try {
          const currencies = JSON.parse(data);
          res.render('home', { 
            title: 'Currency Exchange App',
            currencies: Object.entries(currencies).map(([code, name]) => ({ code, name })),
            isAdmin: req.user.role === 'admin' // Pass admin status to template
          });
        } catch (error) {
          console.error('Error parsing currencies:', error);
          res.status(500).send('Error fetching currency data');
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching currencies:', err);
      res.status(500).send('Error fetching currency data');
    });
  });   
// Exchange rate route - now accepts base currency parameter
app.get('/exchange-rate', (req, res) => {
    const baseCurrency = req.query.base || 'EUR';
    const url = `https://api.frankfurter.app/latest?from=${baseCurrency}`;
  
    https.get(url, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          const ratesWithSelection = Object.entries(parsedData.rates).map(([currency, rate]) => ({
            currency,
            rate,
            isSelected: currency === baseCurrency
          }));
          
          res.render('rates', {
            title: 'Current Exchange Rates',
            rates: parsedData,
            ratesWithSelection,
            currentBase: baseCurrency,
            isAdmin: req.user.role === 'admin' // Pass admin status to template
          });
        } catch (error) {
          console.error('Error parsing API response:', error);
          res.status(500).send('Error fetching exchange rate data');
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching data:', err);
      res.status(500).send('Error fetching exchange rate data');
    });
  });

  app.get('/admin', (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Forbidden');
    }
    res.render('admin', {
      title: 'Admin Panel',
      isAdmin: true
    });
  });
  app.get('/admin/users', (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Forbidden');
    }
    
    db.all("SELECT userid, password, role FROM users", [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        
        res.render('admin-users', {
            title: 'Manage Users',
            users: rows,
            currentUser: req.user.username,
            isAdmin: true
        });
    });
});
// Delete user route
app.post('/admin/users/delete', (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Forbidden');
    }
  
    const { username } = req.body;
    db.run("DELETE FROM users WHERE userid = ?", [username], function(err) {
      if (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });
  // Update user route
  app.post('/admin/users', (req, res) => {
        // Check for valid JSON body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid request body" 
            });
        }
    // Verify admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { oldUsername, newUsername, newPassword } = req.body;

    // Input validation
    if (!newUsername || newUsername.length < 3) {
        return res.status(400).json({ 
            success: false, 
            message: "Username must be at least 3 characters" 
        });
    }

    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: "Password must be at least 8 characters" 
        });
    }

    // Check if username already exists (if changing username)
    if (oldUsername !== newUsername) {
        db.get("SELECT userid FROM users WHERE userid = ?", [newUsername], (err, row) => {
            if (err) {
                console.error('Check username error:', err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            if (row) {
                return res.status(400).json({ success: false, message: "Username already exists" });
            }
            proceedWithUpdate();
        });
    } else {
        proceedWithUpdate();
    }

    function proceedWithUpdate() {
        // Only update password if new one was provided
        let query, params;
        if (newPassword) {
            const hashedPassword = hashPassword(newPassword);
            query = "UPDATE users SET userid = ?, password = ? WHERE userid = ?";
            params = [newUsername, hashedPassword, oldUsername];
        } else {
            query = "UPDATE users SET userid = ? WHERE userid = ?";
            params = [newUsername, oldUsername];
        }

        db.run(query, params, function(err) {
            if (err) {
                console.error('Update error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Failed to update user" 
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "User not found" 
                });
            }

            res.json({ 
                success: true,
                message: "User updated successfully"
            });
        });
        logAudit(
            req, 
            'USER_UPDATE', 
            'users', 
            req.body.oldUsername,
            oldUser,
            { 
                username: req.body.newUsername, 
                role: oldUser.role 
            }
        );
    }
});

// Create user route
app.post('/admin/users', (req, res) => {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid request body" 
        });
    }

    // Verify admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: "Forbidden" 
        });
    }

    const { username, password, role } = req.body;

    // Input validation
    if (!username || username.length < 3) {
        return res.status(400).json({ 
            success: false, 
            message: "Username must be at least 3 characters" 
        });
    }

    if (!password || password.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: "Password must be at least 8 characters" 
        });
    }

    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid role specified" 
        });
    }

    // Check if username exists
    db.get("SELECT userid FROM users WHERE userid = ?", [username], (err, row) => {
        if (err) {
            console.error('Check username error:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Database error" 
            });
        }

        if (row) {
            return res.status(400).json({ 
                success: false, 
                message: "Username already exists" 
            });
        }
        // Hash password and create user
        const hashedPassword = hashPassword(password);
        
        db.run(
            "INSERT INTO users (userid, password, role) VALUES (?, ?, ?)",
            [username, hashedPassword, role],
            function(err) {
                if (err) {
                    console.error('Create user error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Failed to create user" 
                    });
                }

                // Audit log entry
                logAudit(
                    req,
                    'USER_CREATE',
                    'users',
                    username,
                    null, // No old values
                    { username, role }
                );

                res.json({ 
                    success: true,
                    message: "User created successfully",
                    userId: username
                });
            }
        );
    });
});

// Audit logging function (reusable)
function logAudit(req, actionType, targetEntity, targetId, oldValues, newValues) {
    db.run(
        `INSERT INTO audit_logs 
        (timestamp, user_id, action_type, target_entity, target_id, 
         ip_address, user_agent, old_values, new_values, status)
        VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.userid,
            actionType,
            targetEntity,
            targetId,
            req.ip,
            req.get('User-Agent'),
            JSON.stringify(oldValues),
            JSON.stringify(newValues),
            'SUCCESS'
        ],
        (err) => {
            if (err) console.error('Audit log error:', err);
        }
    );
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

