const express = require('express');
const bodyParser = require('body-parser');
const { engine } = require('express-handlebars');
const db = require('./db');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set Handlebars as the template engine
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Routes

// Home Page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Registration Form Page
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

// Handle Registration Form Submission
app.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  const query = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, email, password, role], function (err) {
    if (err) {
      return res.status(400).send("Error: " + err.message);
    }
    res.send("Registration submitted for approval.");
  });
});

// Admin Approval Page
app.get('/admin/approvals', (req, res) => {
  const query = `SELECT * FROM users WHERE approved = 0`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).send("Error fetching approvals.");
    }
    res.render('approval', { users: rows });
  });
});

// Approve User Request
app.post('/admin/approve', (req, res) => {
  const { id } = req.body;

  const query = `UPDATE users SET approved = 1 WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      return res.status(400).send("Error approving user.");
    }
    res.redirect('/admin/approvals');
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}/`));
