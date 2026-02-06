import { getDatabasePool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../observability/logger';

const TOTAL_PRODUCTS = 1_000_000;
const BATCH_SIZE = 1000;

const categories = [
    { id: uuidv4(), name: 'Vegetables', slug: 'vegetables' },
    { id: uuidv4(), name: 'Fruits', slug: 'fruits' },
    { id: uuidv4(), name: 'Dairy', slug: 'dairy' },
    { id: uuidv4(), name: 'Grains', slug: 'grains' },
    { id: uuidv4(), name: 'Spices', slug: 'spices' },
];

const producers = [
    { id: uuidv4(), name: 'Green Valley Farm', location: 'California', verified: true },
    { id: uuidv4(), name: 'Sunrise Orchards', location: 'Oregon', verified: true },
    { id: uuidv4(), name: 'Mountain Dairy Co', location: 'Colorado', verified: true },
    { id: uuidv4(), name: 'Prairie Grains', location: 'Kansas', verified: true },
    { id: uuidv4(), name: 'Spice Route Traders', location: 'New York', verified: true },
];

const productNames = [
    'Organic Tomatoes',
    'Fresh Apples',
    'Whole Milk',
    'Brown Rice',
    'Black Pepper',
    'Sweet Potatoes',
    'Strawberries',
    'Cheddar Cheese',
    'Quinoa',
    'Turmeric Powder',
];

const units = ['kg', 'lb', 'oz', 'liter', 'dozen', 'bunch'];

const getRandomElement = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
};

const getRandomPrice = (): number => {
    return parseFloat((Math.random() * 50 + 1).toFixed(2));
};

const getRandomStock = (): number => {
    return Math.floor(Math.random() * 500);
};

const seedDatabase = async (): Promise<void> => {
    const pool = getDatabasePool();

    try {
        logger.info('Starting database seeding...');

        logger.info('Seeding categories...');
        for (const category of categories) {
            await pool.execute(
                'INSERT INTO categories (id, name, slug) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = name',
                [category.id, category.name, category.slug]
            );
        }

        logger.info('Seeding producers...');
        for (const producer of producers) {
            await pool.execute(
                'INSERT INTO producers (id, name, location, verified) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = name',
                [producer.id, producer.name, producer.location, producer.verified]
            );
        }

        logger.info(`Seeding ${TOTAL_PRODUCTS.toLocaleString()} products in batches of ${BATCH_SIZE}...`);

        const totalBatches = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);

        for (let batch = 0; batch < totalBatches; batch++) {
            const values: string[] = [];
            const params: (string | number)[] = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const productNumber = batch * BATCH_SIZE + i + 1;
                if (productNumber > TOTAL_PRODUCTS) break;

                const id = uuidv4();
                const categoryId = getRandomElement(categories).id;
                const producerId = getRandomElement(producers).id;
                const name = `${getRandomElement(productNames)} #${productNumber}`;
                const description = `High quality ${name.toLowerCase()} from local producers`;
                const price = getRandomPrice();
                const unit = getRandomElement(units);
                const stockQuantity = getRandomStock();
                const isActive = 1;

                values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?)');
                params.push(id, categoryId, producerId, name, description, price, unit, stockQuantity, isActive);
            }

            const query = `
        INSERT INTO products (id, category_id, producer_id, name, description, price, unit, stock_quantity, is_active)
        VALUES ${values.join(', ')}
      `;

            await pool.execute(query, params);

            if ((batch + 1) % 10 === 0) {
                const progress = ((batch + 1) / totalBatches) * 100;
                logger.info(`Progress: ${progress.toFixed(1)}% (${((batch + 1) * BATCH_SIZE).toLocaleString()} products)`);
            }
        }

        logger.info('Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Database seeding failed');
        process.exit(1);
    }
};

seedDatabase();
