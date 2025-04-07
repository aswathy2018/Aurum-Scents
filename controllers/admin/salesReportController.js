const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');

const getSalesReport = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        let filter = req.query.filter || 'today';
        let startDate = req.query.startDate;
        let endDate = req.query.endDate;

        let dateFilter = {};
        const today = moment().startOf('day');

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
            case 'specific':
                if (!startDate || !endDate) {
                    return res.status(400).send("Start and end dates are required for specific filter.");
                }
                // Validate dates are not in future
                const currentDate = moment().startOf('day');
                if (moment(startDate).isAfter(currentDate) || moment(endDate).isAfter(currentDate)) {
                    return res.status(400).send("Future dates are not allowed.");
                }
                // Validate end date is not before start date
                if (moment(endDate).isBefore(moment(startDate))) {
                    return res.status(400).send("End date cannot be before start date.");
                }
                dateFilter = {
                    createdAt: {
                        $gte: moment(startDate).startOf('day').toDate(),
                        $lte: moment(endDate).endOf('day').toDate()
                    }
                };
                break;
            default:
                filter = 'today';
                dateFilter = {
                    createdAt: {
                        $gte: today.toDate(),
                        $lte: moment(today).endOf('day').toDate()
                    }
                };
        }

        const orders = await Order.find(dateFilter)
            .populate('userId', 'name')
            .populate('orderedItems.product')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const allOrders = await Order.find(dateFilter)
            .populate('userId', 'name')
            .populate('orderedItems.product');

        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / limit);

        let totalRevenue = 0;
        let totalOffer = 0;
        allOrders.forEach(order => {
            order.orderedItems.forEach(item => {
                totalRevenue += item.price * item.quantity;
            });
            totalOffer += order.discount || 0;
        });

        const formattedOrders = orders.map(order => ({
            _id: order._id,
            createdAt: order.createdAt,
            userName: order.userId ? order.userId.name : 'Unknown',
            items: order.orderedItems.map(item => ({
                productName: item.product ? item.product.productName : 'Unknown',
                quantity: item.quantity,
                price: item.price
            })),
            discount: order.discount || 0
        }));
        
        res.render('salesreport', {
            orders: formattedOrders,  // Do not slice again, as `orders` is already paginated
            totalRevenue,
            totalOffer,
            totalOrders,
            currentPage: Number(page), // Ensure it's a number
            totalPages,
            fil: filter,
            startDate,
            endDate
        });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.redirect('/404error');
    }
};


const downloadSalesReportPDF = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateFilter = {};
        const today = moment().startOf('day');

        switch (filter) {
            case 'today':
                dateFilter = { createdAt: { $gte: today.toDate(), $lte: moment(today).endOf('day').toDate() } };
                break;
            case 'weekly':
                dateFilter = { createdAt: { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() } };
                break;
            case 'monthly':
                dateFilter = { createdAt: { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() } };
                break;
            case 'yearly':
                dateFilter = { createdAt: { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() } };
                break;
            case 'specific':
                dateFilter = { createdAt: { $gte: moment(startDate).startOf('day').toDate(), $lte: moment(endDate).endOf('day').toDate() } };
                break;
        }

        const orders = await Order.find(dateFilter)
            .populate('userId', 'name')
            .populate('orderedItems.product');

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-disposition', 'attachment; filename=sales-report.pdf');
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(20).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Generated on: ${moment().format('DD-MM-YYYY')}`, { align: 'right' });
        doc.moveDown(1);

        let totalRevenue = 0;
        let totalDiscount = 0;
        let totalOrders = orders.length;

        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                totalRevenue += item.price * item.quantity;
            });
            totalDiscount += order.discount || 0;
        });

        doc.fontSize(12).text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
        doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`);
        doc.text(`Total Orders: ${totalOrders}`).moveDown(1.5);

        const startX = 40;
        const startY = doc.y;
        const colWidths = [60, 80, 90, 80, 40, 50, 60, 60];
        const rowHeight = 20;
        const lineHeight = 15;
        let yPos = startY;

        const drawTableRow = (y, rowData, isHeader = false) => {
            let x = startX;
            doc.fontSize(isHeader ? 10 : 8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
            rowData.forEach((text, i) => {
                doc.text(text, x, y, { width: colWidths[i], align: 'center' });
                x += colWidths[i];
            });

            if (!isHeader) {
                doc.moveTo(startX, y + lineHeight)
                    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + lineHeight)
                    .strokeColor('#aaaaaa')
                    .stroke();
            }
        };

        doc.strokeColor('black').lineWidth(0.5);
        drawTableRow(yPos, ['Date', 'order_id', 'User', 'Product', 'Qty', 'Price', 'Discount', 'Total'], true);
        doc.moveTo(startX, yPos + lineHeight).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), yPos + lineHeight).stroke();
        yPos += rowHeight;

        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const totalAmount = (item.price * item.quantity) - (order.discount || 0);
                drawTableRow(yPos, [
                    moment(order.createdAt).format('DD-MM-YYYY'),
                    order._id.toString().slice(-6),
                    order.userId ? order.userId.name : 'Unknown',
                    item.product ? item.product.productName : 'Unknown',
                    item.quantity.toString(),
                    `₹${item.price.toFixed(2)}`,
                    `₹${order.discount ? order.discount.toFixed(2) : '0.00'}`,
                    `₹${totalAmount.toFixed(2)}`
                ]);
                yPos += rowHeight;
            });
        });

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

const downloadSalesReportExcel = async (req, res) => {
    try {
        const filter = req.query.filter || 'today';
        let startDate = req.query.startDate;
        let endDate = req.query.endDate;

        let dateFilter = {};
        const today = moment().startOf('day');

        switch (filter) {
            case 'today':
                dateFilter = { createdAt: { $gte: today.toDate(), $lte: moment(today).endOf('day').toDate() } };
                break;
            case 'weekly':
                dateFilter = { createdAt: { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() } };
                break;
            case 'monthly':
                dateFilter = { createdAt: { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() } };
                break;
            case 'yearly':
                dateFilter = { createdAt: { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() } };
                break;
            case 'specific':
                dateFilter = { createdAt: { $gte: moment(startDate).startOf('day').toDate(), $lte: moment(endDate).endOf('day').toDate() } };
                break;
        }

        const orders = await Order.find(dateFilter)
            .populate('userId', 'name')
            .populate('orderedItems.product');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'order_id', key: 'orderId', width: 25 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Product Name', key: 'productName', width: 20 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Discount', key: 'discount', width: 10 },
            { header: 'Total', key: 'total', width: 10 }
        ];

        let totalRevenue = 0;
        let totalOffer = 0;
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const total = (item.price * item.quantity) - (order.discount || 0);
                totalRevenue += item.price * item.quantity;
                totalOffer += order.discount || 0;
                worksheet.addRow({
                    date: order.createdAt.toDateString(),
                    orderId: order._id,
                    userName: order.userId ? order.userId.name : 'Unknown',
                    productName: item.product ? item.product.productName : 'Unknown',
                    quantity: item.quantity,
                    price: item.price,
                    discount: order.discount || 0,
                    total: total
                });
            });
        });

        worksheet.addRow(['', '', '', '', '', 'Total Revenue:', totalRevenue, 'Total Discount:', totalOffer]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send("Error generating Excel");
    }
};

module.exports = {
    getSalesReport,
    downloadSalesReportPDF,
    downloadSalesReportExcel
};