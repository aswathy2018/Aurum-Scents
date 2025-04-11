const express = require('express');
const router = express.Router();
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Order = require('../../model/orderSchema');
const moment = require('moment');


const graph = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        
        const today = moment().startOf('day');
        let dateFilter = {};
        
        switch (filter) {
            case 'today':
                dateFilter = {
                    createdAt: {
                        $gte: today.toDate(),
                        $lte: moment(today).endOf('day').toDate()
                    }
                };
                break;
            case 'weekly':
                dateFilter = {
                    createdAt: {
                        $gte: moment().startOf('week').toDate(),
                        $lte: moment().endOf('week').toDate()
                    }
                };
                break;
            case 'monthly':
                dateFilter = {
                    createdAt: {
                        $gte: moment().startOf('month').toDate(),
                        $lte: moment().endOf('month').toDate()
                    }
                };
                break;
            case 'yearly':
                dateFilter = {
                    createdAt: {
                        $gte: moment().startOf('year').toDate(),
                        $lte: moment().endOf('year').toDate()
                    }
                };
                break;
            case 'custom':
                if (!startDate || !endDate) {
                    return res.status(400).json({ message: 'Start and end dates are required for custom filter' });
                }
                
                if (moment(startDate).isSame(moment(endDate), 'day')) {
                    dateFilter = {
                        createdAt: {
                            $gte: moment(startDate).startOf('day').toDate(),
                            $lte: moment(startDate).endOf('day').toDate()
                        }
                    };
                } else {
                    dateFilter = {
                        createdAt: {
                            $gte: moment(startDate).startOf('day').toDate(),
                            $lte: moment(endDate).endOf('day').toDate()
                        }
                    };
                }
                break;
            default:
                return res.status(400).json({ message: 'Invalid filter' });
        }
        
        const sales = await Order.aggregate([
            { $match: { ...dateFilter, paymentStatus: 'Paid' } }, 
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