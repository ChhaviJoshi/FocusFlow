
import pg from 'pg';

const connectionString = 'postgresql://focusflow:password@localhost:5432/focusflow';

const pool = new pg.Pool({
  connectionString,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    client.release();
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
