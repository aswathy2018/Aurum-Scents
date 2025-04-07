const express = require('express');
const router = express.Router();
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Order = require('../../model/orderSchema');

const graph = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateFrom = new Date();
        let dateTo = new Date();

        if (filter === 'yearly') {
            dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        } else if (filter === 'monthly') {
            dateFrom.setMonth(dateFrom.getMonth() - 1);
        } else if (filter === 'weekly') {
            dateFrom.setDate(dateFrom.getDate() - 7);
        } else if (filter === 'today') {
            dateFrom.setHours(0, 0, 0, 0);
            dateTo.setHours(23, 59, 59, 999);
        } else if (filter === 'custom' && startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
        } else {
            return res.status(400).json({ message: 'Invalid filter' });
        }

        const sales = await Order.aggregate([
            { $match: { createdAt: { $gte: dateFrom, $lte: dateTo }, paymentStatus: 'Paid' } },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    totalSales: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(sales);
    } catch (error) {
        console.error('Error in sales report:', error);
        res.status(500).json({ error: error.message });
    }
};

const bestproduct = async (req, res) => {
    try {
        const products = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalSold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        const graphDetails = await Promise.all(
            products.map(async (item) => {
                const product = await Product.findById(item._id, 'productName');
                return {
                    productName: product?.productName || 'Unknown',
                    totalSold: item.totalSold
                };
            })
        );

        res.json(graphDetails);
    } catch (error) {
        console.error('Error in best selling products:', error);
        res.status(500).json({ error: error.message });
    }
};

const bestbrand = async (req, res) => {
    try {
        const brands = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalSold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        res.json(brands);
    } catch (error) {
        console.error('Error in best selling brands:', error);
        res.status(500).json({ error: error.message });
    }
};

const bestcategory = async (req, res) => {
    try {
        const categories = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.category',
                    totalSold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        const categoryDetails = await Promise.all(
            categories.map(async (item) => {
                const category = await Category.findById(item._id, 'name');
                return {
                    categoryName: category?.name || 'Unknown Category',
                    totalSold: item.totalSold
                };
            })
        );

        res.json(categoryDetails);
    } catch (error) {
        console.error('Error in best selling categories:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    graph,
    bestcategory,
    bestbrand,
    bestproduct
};