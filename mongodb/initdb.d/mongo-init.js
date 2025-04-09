db.createUser({
    user: process.env.MONGODB_USERNAME,
    pwd: process.env.MONGODB_PASSWORD,
    roles: [{
        role: process.env.NODE_ENV === 'production'
            ? 'readWrite'
            : 'root', db: 'test'
    }],
});
db.init.insertOne({ initialized: true });

print('MongoDB initialization complete');