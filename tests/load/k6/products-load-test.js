import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 500 },
        { duration: '3m', target: 1000 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<200', 'p(99)<500'],
        errors: ['rate<0.01'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
    const scenarios = [basicList, withSearch, withFilters, withPagination];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    scenario();
    sleep(1);
}

function basicList() {
    const res = http.get(`${BASE_URL}/api/v1/products?limit=20&sort=created_at&order=desc`);

    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'has products': (r) => JSON.parse(r.body).data.length > 0,
        'has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
        'p95 < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) {
        errorRate.add(1);
    }
}

function withSearch() {
    const searchTerms = ['organic', 'fresh', 'tomatoes', 'apples', 'milk'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const res = http.get(`${BASE_URL}/api/v1/products?search=${term}&limit=20`);

    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'p95 < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) {
        errorRate.add(1);
    }
}

function withFilters() {
    const minPrice = Math.floor(Math.random() * 20);
    const maxPrice = minPrice + 30;

    const res = http.get(
        `${BASE_URL}/api/v1/products?minPrice=${minPrice}&maxPrice=${maxPrice}&limit=20`
    );

    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'p95 < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) {
        errorRate.add(1);
    }
}

function withPagination() {
    const firstPage = http.get(`${BASE_URL}/api/v1/products?limit=20`);

    if (firstPage.status === 200) {
        const body = JSON.parse(firstPage.body);
        const cursor = body.pagination?.nextCursor;

        if (cursor) {
            const secondPage = http.get(`${BASE_URL}/api/v1/products?limit=20&cursor=${cursor}`);

            const success = check(secondPage, {
                'status is 200': (r) => r.status === 200,
                'p95 < 200ms': (r) => r.timings.duration < 200,
            });

            if (!success) {
                errorRate.add(1);
            }
        }
    }
}
