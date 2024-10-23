// app.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json()); // To parse incoming JSON requests

// Create or connect to SQLite database
const db = new sqlite3.Database('./db/expenses.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQLite database.');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT
    );
  `);
});

// API Endpoints

// 1. Add a new transaction
app.post('/api/transactions', (req, res) => {
  const { type, category, amount, date, description } = req.body;
  if (!type || !category || !amount || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const sql = `INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`;
  const params = [type, category, amount, date, description];
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

// 2. Retrieve all transactions
app.get('/api/transactions', (req, res) => {
  const sql = `SELECT * FROM transactions`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 3. Retrieve a transaction by ID
app.get('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM transactions WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(row);
  });
});

// 4. Update a transaction by ID
app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { type, category, amount, date, description } = req.body;
  const sql = `UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?`;
  const params = [type, category, amount, date, description, id];
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction updated successfully' });
  });
});

// 5. Delete a transaction by ID
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM transactions WHERE id = ?`;
  db.run(sql, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  });
});

// 6. Retrieve a summary of transactions
app.get('/api/summary', (req, res) => {
  const sqlIncome = `SELECT SUM(amount) AS totalIncome FROM transactions WHERE type = 'income'`;
  const sqlExpenses = `SELECT SUM(amount) AS totalExpenses FROM transactions WHERE type = 'expense'`;

  db.get(sqlIncome, (err, incomeRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get(sqlExpenses, (err, expenseRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const totalIncome = incomeRow.totalIncome || 0;
      const totalExpenses = expenseRow.totalExpenses || 0;
      const balance = totalIncome - totalExpenses;
      res.json({
        totalIncome,
        totalExpenses,
        balance
      });
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
