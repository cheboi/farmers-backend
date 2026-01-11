function validateFarmerRegistration(data) {
  const {
    username,
    password,
    firstName,
    lastName,
    farmSize,
    cropType,
    livestockType,
  } = data;

  if (!username || !password) {
    return "Username and password are required";
  }

  if (!firstName || !lastName) {
    return "First name and last name are required";
  }

  if (!farmSize) {
    return "Farm size is required";
  }

  if (!cropType && !livestockType) {
    return "Farmer must have at least a crop type or livestock type";
  }

  return null; // no errors
}

module.exports = validateFarmerRegistration;
