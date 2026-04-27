// const fetch = require('node-fetch'); // Using global fetch (Node 18+)

const BASE_URL = 'http://localhost:9000';
const EMAIL = 'admin2@medusa-test.com';
const PASSWORD = 'supersecret';

async function main() {
    try {
        console.log('Authenticating...');
        let authRes = await fetch(`${BASE_URL}/admin/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        });

        if (!authRes.ok) {
            console.log('Standard auth failed, trying V2 emailpass...');
            authRes = await fetch(`${BASE_URL}/auth/user/emailpass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
            });
        }

        if (!authRes.ok) {
            throw new Error(`Auth failed: ${authRes.statusText} (${authRes.status})`);
        }

        const authData = await authRes.json();
        console.log('Auth Data:', authData);

        let headers = {
            'Content-Type': 'application/json',
        };

        if (authRes.headers.get('set-cookie')) {
            headers['Cookie'] = authRes.headers.get('set-cookie');
        } else if (authData.token) {
            headers['Authorization'] = `Bearer ${authData.token}`;
        } else if (authData.access_token) {
            headers['Authorization'] = `Bearer ${authData.access_token}`;
        }

        // console.log('Using Headers:', headers);

        console.log('Checking Regions...');
        const regionRes = await fetch(`${BASE_URL}/admin/regions`, { headers });
        const regionData = await regionRes.json();

        let regionId;
        const existing = regionData.regions.find(r => r.name === 'Turkey');
        if (existing) {
            console.log('Region Turkey exists:', existing.id);
            regionId = existing.id;
        } else {
            console.log('Creating Region Turkey...');
            const createRes = await fetch(`${BASE_URL}/admin/regions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: 'Turkey',
                    currency_code: 'try',
                    countries: ['tr'] // ISO 2 code
                })
            });
            const createData = await createRes.json();
            if (!createRes.ok) console.error(createData);
            regionId = createData.region.id;
            console.log('Created Region:', regionId);
        }

        // Product
        console.log('Checking Products...');
        const prodRes = await fetch(`${BASE_URL}/admin/products`, { headers });
        const prodData = await prodRes.json();

        if (prodData.products.length === 0) {
            console.log('Creating T-Shirt...');
            const createProd = await fetch(`${BASE_URL}/admin/products`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: 'Ayna T-Shirt',
                    options: [{ title: 'Size', values: ['S', 'M', 'L'] }],
                    variants: [
                        { title: 'S', prices: [{ amount: 1000, currency_code: 'try' }], options: { Size: 'S' } },
                        { title: 'M', prices: [{ amount: 1000, currency_code: 'try' }], options: { Size: 'M' } },
                        { title: 'L', prices: [{ amount: 1000, currency_code: 'try' }], options: { Size: 'L' } }
                    ]
                })
            });
            const prodJson = await createProd.json();
            console.log('Created Product:', prodJson.product?.id);
        } else {
            console.log('Product exists.');
        }

        // Publishable API Key
        console.log('Checking API Keys...');
        const keysRes = await fetch(`${BASE_URL}/admin/api-keys?type=publishable`, { headers });
        const keysData = await keysRes.json();

        let pubKey;
        const existingKey = keysData.api_keys.find(k => k.title === 'Next.js Key');
        if (existingKey) {
            console.log('API Key exists:', existingKey.token);
            pubKey = existingKey.token;
        } else {
            console.log('Creating API Key...');
            const createKey = await fetch(`${BASE_URL}/admin/api-keys`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ title: 'Next.js Key', type: 'publishable' })
            });
            const keyJson = await createKey.json();
            pubKey = keyJson.api_key.token;
            console.log('Created API Key:', pubKey);

            // Link to Sales Channel
            console.log('Linking to Sales Channel...');
            // Get SC
            const scRes = await fetch(`${BASE_URL}/admin/sales-channels`, { headers });
            const scData = await scRes.json();
            const defSc = scData.sales_channels[0]; // Use first one

            if (defSc) {
                await fetch(`${BASE_URL}/admin/api-keys/${keyJson.api_key.id}/sales-channels`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ sales_channel_ids: [defSc.id] })
                });
                console.log('Linked Key to SC:', defSc.id);
            }
        }

        console.log('*** USE THIS KEY IN STOREFRONT ***');
        console.log(pubKey);

        console.log('Done.');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
