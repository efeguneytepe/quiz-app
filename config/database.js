const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            authSource: 'admin'
        });

        console.log(`MongoDB Bağlandı: ${conn.connection.host}`);
        console.log(`Veritabanı Adı: ${conn.connection.db.databaseName}`);
        
        // Mevcut koleksiyonları listele
        const collections = await conn.connection.db.listCollections().toArray();
        console.log('Mevcut Koleksiyonlar:', collections.map(c => c.name));
    } catch (error) {
        console.error('MongoDB Bağlantı Hatası:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;