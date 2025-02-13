import mongoose from 'mongoose';

export interface DatabaseConfig {
    uri: string;
    dbName: string;
    options?: mongoose.ConnectOptions;
}

export async function connect(config: DatabaseConfig): Promise<mongoose.Connection> {
    try {
        await mongoose.connect(config.uri, {
            dbName: config.dbName,
            ...config.options
        });

        const connection = mongoose.connection;

        connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });

        connection.once('open', () => {
            console.log('Connected to MongoDB');
        });

        return connection;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export async function disconnect(): Promise<void> {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}

export async function isConnected(): Promise<boolean> {
    return mongoose.connection.readyState === mongoose.STATES.connected;
}