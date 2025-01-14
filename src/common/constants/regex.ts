export const PASSWORD_REGEX = /^(?=(.*[a-zA-Z]))(?=(.*\d)).{7,32}$/;

export const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 7 characters long but no more then 32, and contain at least one letter and one number.';
