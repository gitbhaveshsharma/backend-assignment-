import pool from '../db/mysql';
import { logger } from '../utils/logger';

// Categories for FarmLokal products
const CATEGORIES = [
    'milk',
    'dairy',
    'vegetables',
    'fruits',
    'groceries',
    'grains',
    'spices',
];

// Sample product names for each category
const PRODUCT_NAMES: Record<string, string[]> = {
    milk: ['Fresh Cow Milk', 'Buffalo Milk', 'Organic Milk', 'Toned Milk', 'Full Cream Milk'],
    dairy: ['Paneer', 'Curd', 'Butter', 'Ghee', 'Cheese', 'Buttermilk'],
    vegetables: ['Tomatoes', 'Potatoes', 'Onions', 'Spinach', 'Carrots', 'Capsicum', 'Cabbage'],
    fruits: ['Apples', 'Bananas', 'Oranges', 'Mangoes', 'Grapes', 'Pomegranate'],
    groceries: ['Rice', 'Wheat Flour', 'Sugar', 'Salt', 'Oil', 'Dal', 'Besan'],
    grains: ['Basmati Rice', 'Brown Rice', 'Wheat', 'Jowar', 'Bajra', 'Oats'],
    spices: ['Turmeric', 'Red Chilli', 'Cumin', 'Coriander', 'Garam Masala', 'Black Pepper'],
};

// Create products table
async function createTable(): Promise<void> {
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      stock INT DEFAULT 0,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      INDEX idx_category (category),
      INDEX idx_price (price),
      INDEX idx_name (name),
      INDEX idx_created_at (created_at),
      INDEX idx_category_price (category, price)
    )
  `;

    await pool.execute(createTableSQL);
    logger.info('Products table created/verified');
}

// Generate random product data
function generateProduct(index: number) {
    const category = CATEGORIES[index % CATEGORIES.length];
    const names = PRODUCT_NAMES[category];
    const baseName = names[index % names.length];

    return {
        name: `${baseName} - Batch ${Math.floor(index / 100)}`,
        description: `Fresh ${baseName} from local farmers. Quality guaranteed.`,
        price: (Math.random() * 500 + 10).toFixed(2),
        category,
        stock: Math.floor(Math.random() * 1000) + 10,
    };
}

// Insert products in batches for better performance
async function seedProducts(totalCount: number, batchSize: number = 1000): Promise<void> {
    logger.info(`Starting to seed ${totalCount} products...`);

    const insertSQL = `
    INSERT INTO products (name, description, price, category, stock, created_at, updated_at)
    VALUES ?
  `;

    let inserted = 0;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    while (inserted < totalCount) {
        const batch: any[][] = [];
        const currentBatchSize = Math.min(batchSize, totalCount - inserted);

        for (let i = 0; i < currentBatchSize; i++) {
            const product = generateProduct(inserted + i);
            batch.push([
                product.name,
                product.description,
                product.price,
                product.category,
                product.stock,
                now,
                now,
            ]);
        }

        await pool.query(insertSQL, [batch]);
        inserted += currentBatchSize;

        // Log progress every 10000 records
        if (inserted % 10000 === 0) {
            logger.info(`Inserted ${inserted}/${totalCount} products`);
        }
    }

    logger.info(`Seeding complete! Total products: ${totalCount}`);
}

// Main seed function
async function seed(): Promise<void> {
    try {
        logger.info('Starting database seeding...');

        // Create table
        await createTable();

        // Check if data already exists
        const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM products');
        const existingCount = rows[0].count;

        if (existingCount > 0) {
            logger.info(`Database already has ${existingCount} products`);
            const shouldReseed = process.argv.includes('--force');

            if (shouldReseed) {
                logger.info('Force flag detected, truncating and reseeding...');
                await pool.execute('TRUNCATE TABLE products');
            } else {
                logger.info('Use --force flag to reseed. Exiting.');
                process.exit(0);
            }
        }

        // Seed 100000 products (can increase for 1M)
        // Using 100k for demo, increase to 1000000 for full simulation
        await seedProducts(100000);

        logger.info('Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Seeding failed:', error);
        process.exit(1);
    }
}

// Run seed
seed();
