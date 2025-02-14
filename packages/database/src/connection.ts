import mongoose from 'mongoose';
import EventEmitter from 'events';

interface ConnectionOptions {
    uri: string;
    dbName: string;
}

let connection: mongoose.Connection | null = null;

export async function connect(options: ConnectionOptions): Promise<mongoose.Connection> {
    if (connection) {
        return connection;
    }

    try {
        // Set max listeners for the connection events
        const conn = mongoose.connection;
        conn.setMaxListeners(15); // Increase from default 10

        // Connect to MongoDB
        await mongoose.connect(options.uri, {
            dbName: options.dbName,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        connection = mongoose.connection;

        // Handle connection events
        connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
            connection = null;
        });

        console.log('MongoDB connected successfully');
        return connection;

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function disconnect(): Promise<void> {
    if (connection) {
        await mongoose.disconnect();
        connection = null;
    }
}

// Ensure clean disconnect on process termination
process.on('SIGINT', async () => {
    await disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnect();
    process.exit(0);
});