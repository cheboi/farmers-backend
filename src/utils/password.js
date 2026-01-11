const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

//hashing password
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Compare login password 
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
