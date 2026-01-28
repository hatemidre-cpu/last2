// Simple sales forecasting using linear regression
export const forecastSales = (historicalData: { date: string; sales: number }[], daysToForecast: number = 7) => {
    if (historicalData.length < 2) return [];

    // Extract sales values
    const sales = historicalData.map(d => d.sales);
    const n = sales.length;

    // Calculate linear regression
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = sales.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (xValues[i] - xMean) * (sales[i] - yMean);
        denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Generate forecast
    const forecast: { date: string; sales: number; isForecast: boolean }[] = [];
    for (let i = 0; i < daysToForecast; i++) {
        const x = n + i;
        const predictedSales = slope * x + intercept;
        const date = new Date();
        date.setDate(date.getDate() + i + 1);

        forecast.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: Math.max(0, predictedSales), // Ensure non-negative
            isForecast: true
        });
    }

    return forecast;
};

// Calculate trend direction and strength
export const calculateTrend = (data: number[]): { direction: 'up' | 'down' | 'stable'; strength: number } => {
    if (data.length < 2) return { direction: 'stable', strength: 0 };

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) < 5) return { direction: 'stable', strength: Math.abs(change) };
    return {
        direction: change > 0 ? 'up' : 'down',
        strength: Math.abs(change)
    };
};

// Calculate customer lifetime value prediction
export const predictCLV = (
    avgOrderValue: number,
    purchaseFrequency: number,
    customerLifespan: number = 3 // years
): number => {
    return avgOrderValue * purchaseFrequency * customerLifespan; // yearly
};

// Segment customers by RFM (Recency, Frequency, Monetary)
export const segmentCustomers = (customers: Array<{
    id: string;
    lastPurchaseDays: number;
    totalOrders: number;
    totalSpent: number;
}>) => {
    if (customers.length === 0) return [];

    // Calculate quartiles for each metric
    const recencies = customers.map(c => c.lastPurchaseDays).sort((a, b) => a - b);
    const frequencies = customers.map(c => c.totalOrders).sort((a, b) => b - a);
    const monetaries = customers.map(c => c.totalSpent).sort((a, b) => b - a);

    const getQuartile = (value: number, sortedArray: number[]) => {
        const index = sortedArray.indexOf(value);
        const quartile = Math.floor((index / sortedArray.length) * 4) + 1;
        return Math.min(quartile, 4);
    };

    return customers.map(customer => {
        const r = 5 - getQuartile(customer.lastPurchaseDays, recencies); // Invert recency
        const f = getQuartile(customer.totalOrders, frequencies);
        const m = getQuartile(customer.totalSpent, monetaries);

        let segment = 'Regular';
        if (r >= 4 && f >= 4 && m >= 4) segment = 'Champions';
        else if (r >= 3 && f >= 3 && m >= 3) segment = 'Loyal';
        else if (r >= 4 && f <= 2) segment = 'New';
        else if (r <= 2 && f >= 3) segment = 'At Risk';
        else if (r <= 2 && f <= 2) segment = 'Lost';

        return {
            ...customer,
            segment,
            rfmScore: r + f + m
        };
    });
};

// Market Basket Analysis: Find frequently bought together items
export const getBundleRecommendations = (orders: Array<{ items: any[] }>) => {
    const productPairs = new Map<string, number>();
    const productCounts = new Map<string, number>();

    orders.forEach(order => {
        // Get unique product IDs in this order (handle both id and productId)
        const productIds = Array.from(new Set(order.items.map((item: any) => item.productId || item.id)));

        // Count individual product occurrences
        productIds.forEach(id => {
            productCounts.set(id, (productCounts.get(id) || 0) + 1);
        });

        // Count pairs
        for (let i = 0; i < productIds.length; i++) {
            for (let j = i + 1; j < productIds.length; j++) {
                // Sort IDs to ensure consistent key (A-B is same as B-A)
                const pair = [productIds[i], productIds[j]].sort().join('|');
                productPairs.set(pair, (productPairs.get(pair) || 0) + 1);
            }
        }
    });

    // Calculate confidence and lift
    const recommendations: Array<{
        products: string[];
        frequency: number;
        confidence: number;
    }> = [];

    productPairs.forEach((count, pair) => {
        const [p1, p2] = pair.split('|');
        const p1Count = productCounts.get(p1) || 0;
        const p2Count = productCounts.get(p2) || 0;

        const confidence = count / Math.max(p1Count, p2Count); // Conservative confidence

        if (count >= 2 && confidence > 0.1) { // Filter out very rare pairs
            recommendations.push({
                products: [p1, p2],
                frequency: count,
                confidence
            });
        }
    });

    return recommendations.sort((a, b) => b.frequency - a.frequency).slice(0, 10); // Top 10 pairs
};

// Get recommendations for specific products (e.g. cart items)
export const getRecommendationsForProducts = (orders: Array<{ items: any[] }>, targetProductIds: string[]) => {
    const productPairs = new Map<string, number>();

    // Analyze orders to find what goes with the target products
    orders.forEach(order => {
        const orderProductIds = Array.from(new Set(order.items.map((item: any) => item.productId || item.id)));

        // Check if this order contains any of our target products
        const containsTarget = orderProductIds.some(id => targetProductIds.includes(id));

        if (containsTarget) {
            // Find associations
            orderProductIds.forEach(id => {
                // If this product is NOT one of the target products, it's a potential recommendation
                if (!targetProductIds.includes(id)) {
                    productPairs.set(id, (productPairs.get(id) || 0) + 1);
                }
            });
        }
    });

    // Convert to array and sort by frequency
    const recommendations = Array.from(productPairs.entries())
        .map(([productId, frequency]) => ({ productId, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5); // Top 5 recommendations

    return recommendations;
};

// Calculate Cohort Analysis (Retention)
export const calculateCohorts = (
    users: Array<{ id: string; createdAt: Date }>,
    orders: Array<{ userId: string; createdAt: Date }>
) => {
    // 1. Group users by acquisition month (YYYY-MM)
    const cohorts = new Map<string, Set<string>>(); // Month -> Set of UserIDs

    users.forEach(user => {
        const month = new Date(user.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!cohorts.has(month)) {
            cohorts.set(month, new Set());
        }
        cohorts.get(month)!.add(user.id);
    });

    // 2. Pre-process orders: UserId -> Set of Order Months
    const userOrderMonths = new Map<string, Set<string>>();
    orders.forEach(order => {
        const month = new Date(order.createdAt).toISOString().slice(0, 7);
        if (!userOrderMonths.has(order.userId)) {
            userOrderMonths.set(order.userId, new Set());
        }
        userOrderMonths.get(order.userId)!.add(month);
    });

    // 3. Calculate retention for each cohort
    const result: Array<{ cohort: string; size: number; retention: number[] }> = [];

    // Sort cohorts chronologically
    const sortedCohorts = Array.from(cohorts.keys()).sort();
    const currentMonth = new Date().toISOString().slice(0, 7);

    sortedCohorts.forEach(cohortMonth => {
        const cohortUsers = cohorts.get(cohortMonth)!;
        const cohortSize = cohortUsers.size;
        const retention: number[] = [];

        // Check retention for Month 0, 1, 2... up to 12 months
        for (let i = 0; i <= 12; i++) {
            // Calculate the target month (Cohort Month + i months)
            const date = new Date(cohortMonth + '-02'); // Use 02 to avoid timezone issues with 01
            date.setMonth(date.getMonth() + i);
            const targetMonth = date.toISOString().slice(0, 7);

            // Stop if target month is in the future
            if (targetMonth > currentMonth) break;

            // Find users from this cohort who had an order in the target month
            let activeUsers = 0;
            cohortUsers.forEach(userId => {
                if (userOrderMonths.get(userId)?.has(targetMonth)) {
                    activeUsers++;
                }
            });

            const percentage = cohortSize > 0 ? Math.round((activeUsers / cohortSize) * 100) : 0;
            retention.push(percentage);
        }

        result.push({
            cohort: cohortMonth,
            size: cohortSize,
            retention
        });
    });

    return result;
};
