const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Tabela de domicílios
    db.run(`CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'member')) NOT NULL,
      household_id INTEGER,
      timezone TEXT DEFAULT 'UTC',
      language TEXT DEFAULT 'pt-BR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households (id)
    )`);

    // Tabela de gatos
    db.run(`CREATE TABLE IF NOT EXISTS cats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_url TEXT,
      birthdate DATE,
      weight REAL,
      restrictions TEXT,
      notes TEXT,
      household_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households (id)
    )`);

    // Tabela de grupos de gatos
    db.run(`CREATE TABLE IF NOT EXISTS cat_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      household_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households (id)
    )`);

    // Tabela de relação entre gatos e grupos
    db.run(`CREATE TABLE IF NOT EXISTS cat_group_members (
      cat_id INTEGER,
      group_id INTEGER,
      PRIMARY KEY (cat_id, group_id),
      FOREIGN KEY (cat_id) REFERENCES cats (id),
      FOREIGN KEY (group_id) REFERENCES cat_groups (id)
    )`);

    // Tabela de agendamentos
    db.run(`CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cat_id INTEGER,
      type TEXT CHECK(type IN ('fixed', 'interval')) NOT NULL,
      interval_minutes INTEGER,
      times TEXT, -- JSON array de horários para tipo fixed
      override_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cat_id) REFERENCES cats (id)
    )`);

    // Tabela de registros de alimentação
    db.run(`CREATE TABLE IF NOT EXISTS feeding_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      portion_size REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cat_id) REFERENCES cats (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
}

module.exports = db; 