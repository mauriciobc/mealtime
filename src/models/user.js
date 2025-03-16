const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, email, password, role = 'member' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        [name, email, passwordHash, role],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, name, email, role });
          }
        }
      );
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, user) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        }
      );
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, email, role, household_id, timezone, language FROM users WHERE id = ?',
        [id],
        (err, user) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        }
      );
    });
  }

  static async updateProfile(id, { name, timezone, language }) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET name = ?, timezone = ?, language = ? WHERE id = ?',
        [name, timezone, language, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, name, timezone, language });
          }
        }
      );
    });
  }

  static async joinHousehold(userId, householdId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET household_id = ? WHERE id = ?',
        [householdId, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ userId, householdId });
          }
        }
      );
    });
  }
}

module.exports = User; 