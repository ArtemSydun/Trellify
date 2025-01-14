db.createUser({
  user: process.env.MONGODB_USERNAME,
  pwd: process.env.MONGODB_PASSWORD,
  roles: [{ role: 'root', db: 'admin' }],
});

print('MongoDB initialization complete');
