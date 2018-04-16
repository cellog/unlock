module.exports = {
  "extends": ["standard", "eslint:recommended", "plugin:react/recommended"],
  "env": {
    "browser": true,
    "jest": true
  },
  globals: {},
  rules: {
    "react/jsx-uses-vars": 2,
    "react/forbid-prop-types": 2,
    "comma-dangle": [2, "always-multiline"],
  }
};