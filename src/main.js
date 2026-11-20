/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - discount / 100;
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    }
    if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    if (index === total - 1) {
        return 0;
    }
    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Не переданы опции');
    }
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('В опциях должны быть переданы функции расчёта');
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map((stat) => [stat.id, stat]));
    const productIndex = Object.fromEntries(data.products.map((product) => [product.sku, product]));

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach((item) => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования и подготовка итоговой коллекции
    const totalSellers = sellerStats.length;

    return sellerStats.map((seller, index) => {
        const bonus = calculateBonus(index, totalSellers, seller);

        const topProducts = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
                           profit: +seller.profit.toFixed(2),
                           sales_count: seller.sales_count,
                           top_products: topProducts,
                           bonus: +bonus.toFixed(2),
        };
    });
}
