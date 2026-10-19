const express = require("express");
const Order = require("../models/Order");
const PosSale = require("../models/PosSale");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const VendorPayment = require("../models/VendorPayment");
const PurchaseAdjustment = require("../models/PurchaseAdjustment");
const StoreLocation = require("../models/StoreLocation");

const router = express.Router();
const REPORT_ROW_LIMIT = 5000;
const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));
const entityId = (value) => String(value?._id || value || "");
const entityName = (value, fallback = "Unknown") => value?.name || fallback;
const sendReportRows = (response, rows, summary) => response.json({
  success: true,
  data: { rows: rows.slice(0, REPORT_ROW_LIMIT), summary, total: rows.length, limited: rows.length > REPORT_ROW_LIMIT },
});

const scopedFilter = (filter, scope) => scope ? { $and: [filter, scope] } : filter;
const getReportLocation = async (request) => {
  if (!request.user.locationId) return null;
  const location = await StoreLocation.findOne({ _id: request.user.locationId, active: true }).select("_id isDefault").lean();
  if (!location) throw Object.assign(new Error("Your assigned store location is no longer available."), { statusCode: 403 });
  return location;
};
const purchaseLocationScope = (location) => location?.isDefault
  ? { $or: [{ location: location._id }, { location: null }] }
  : location ? { location: location._id } : null;

const getProfitSales = async (from, to, location) => {
  const dateFilter = { createdAt: { $gte: from, $lte: to } };
  const [posSales, onlineOrders] = await Promise.all([
    PosSale.find(scopedFilter({ ...dateFilter, paymentStatus: "Paid" }, location ? { location: location._id } : null))
      .populate("customer", "name")
      .populate("items.purchase", "unitCost")
      .sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
    Order.find(scopedFilter({ ...dateFilter, paymentStatus: "Paid", status: { $ne: "Cancelled" }, $or: [{ posInvoiceNumber: "" }, { posInvoiceNumber: { $exists: false } }] }, location ? { store: location._id } : null))
      .populate("customer", "name")
      .sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
  ]);
  const posRows = posSales.map((sale) => {
    let cost = 0;
    let estimatedCost = false;
    const products = (sale.items || []).map((item) => {
      const unitCost = Number(item.purchase?.unitCost) || Number(item.unitPrice) * 0.7;
      if (!Number(item.purchase?.unitCost)) estimatedCost = true;
      const quantity = Number(item.quantity) || 0;
      const movedQuantity = quantity + (Number(item.freeQuantity) || 0);
      const revenue = Math.max(0, Number(item.amount) || (Number(item.unitPrice) || 0) * quantity - (Number(item.discount) || 0));
      const lineCost = unitCost * movedQuantity;
      cost += lineCost;
      return { productId: entityId(item.product), product: item.productName || "Product", units: quantity, revenue, cost: lineCost };
    });
    const itemRevenue = products.reduce((sum, item) => sum + item.revenue, 0);
    const promotionDiscount = Number(sale.promotionDiscount) || 0;
    const netProducts = products.map((item) => ({ ...item, revenue: Math.max(0, item.revenue - (itemRevenue ? promotionDiscount * item.revenue / itemRevenue : 0)) }));
    const revenue = Math.max(0, (Number(sale.subtotal) || 0) - (Number(sale.discount) || 0));
    return {
      key: `pos-${sale._id}`, date: sale.createdAt, invoice: sale.invoiceNumber, source: "POS",
      customer: sale.customer?.name || sale.customerName || "Walk-in Customer", items: sale.items?.length || 0,
      revenue: roundMoney(revenue), cost: roundMoney(cost), profit: roundMoney(revenue - cost),
      marginPercent: revenue ? roundMoney((revenue - cost) / revenue * 100) : 0, estimatedCost, products: netProducts,
    };
  });
  const orderRows = onlineOrders.map((order) => {
    let estimatedCost = false;
    const products = (order.items || []).map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.costPrice) || Number(item.price) * 0.7;
      if (!Number(item.costPrice)) estimatedCost = true;
      const revenue = Math.max(0, Number(item.price) || 0) * quantity;
      return { productId: entityId(item.product), product: item.name || "Product", units: quantity, revenue, cost: unitCost * quantity };
    });
    const itemRevenue = products.reduce((sum, item) => sum + item.revenue, 0);
    const cost = products.reduce((sum, item) => sum + item.cost, 0);
    const promotionDiscount = Number(order.promoDiscount) || 0;
    const netProducts = products.map((item) => ({ ...item, revenue: Math.max(0, item.revenue - (itemRevenue ? promotionDiscount * item.revenue / itemRevenue : 0)) }));
    const revenue = Math.max(0, itemRevenue - promotionDiscount);
    return {
      key: `order-${order._id}`, date: order.createdAt, invoice: order.orderNumber, source: "Online order",
      customer: order.customer?.name || "Customer", items: order.items?.length || 0,
      revenue: roundMoney(revenue), cost: roundMoney(cost), profit: roundMoney(revenue - cost),
      marginPercent: revenue ? roundMoney((revenue - cost) / revenue * 100) : 0, estimatedCost, products: netProducts,
    };
  });
  return [...posRows, ...orderRows].sort((first, second) => new Date(second.date) - new Date(first.date));
};

const getDateRange = (request) => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 29);
  const from = request.query.from ? new Date(`${request.query.from}T00:00:00.000Z`) : defaultFrom;
  const to = request.query.to ? new Date(`${request.query.to}T23:59:59.999Z`) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Invalid report date range.");
  return { from, to };
};

router.get("/sales-transactions", async (request, response, next) => {
  try {
    const location = await getReportLocation(request);
    const { from, to } = getDateRange(request);
    const filter = scopedFilter({ createdAt: { $gte: from, $lte: to } }, location ? { location: location._id } : null);
    const [sales, total] = await Promise.all([
      PosSale.find(filter)
        .populate("customer", "name email phone customerSource")
        .populate("location", "name city")
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean(),
      PosSale.countDocuments(filter),
    ]);
    response.json({ success: true, data: { sales, total, from, to, limited: total > sales.length } });
  } catch (error) {
    if (error.message === "Invalid report date range.") return response.status(400).json({ success: false, message: error.message });
    return next(error);
  }
});

router.get("/:reportType", async (request, response, next) => {
  try {
    const location = await getReportLocation(request);
    const { from, to } = getDateRange(request);
    const { reportType } = request.params;
    const dateFilter = { $gte: from, $lte: to };
    const purchaseScope = purchaseLocationScope(location);

    if (reportType === "purchase-transactions") {
      const [entries, total] = await Promise.all([
        Purchase.find(scopedFilter({ purchaseDate: dateFilter }, purchaseScope)).populate("vendor", "name email phone").populate("product", "name").populate("location", "name").sort({ purchaseDate: -1, createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        Purchase.countDocuments(scopedFilter({ purchaseDate: dateFilter }, purchaseScope)),
      ]);
      const rows = entries.map((entry) => ({
        key: String(entry._id), date: entry.purchaseDate, invoice: entry.invoiceNumber,
        vendorInvoice: entry.vendorInvoiceNumber || "-", vendor: entityName(entry.vendor),
        product: entry.product?.name || entry.productName || "Product", variant: entry.variant || "-",
        batch: entry.batchNumber || "-", quantity: Number(entry.quantity) || 0, freeQuantity: Number(entry.freeQuantity) || 0,
        rate: Number(entry.rate) || 0, taxCode: entry.taxCode || "-", tax: Number(entry.taxAmount) || 0,
        amount: Number(entry.total) || 0, paid: Number(entry.paidAmount) || 0,
        due: Math.max(0, (Number(entry.total) || 0) - (Number(entry.paidAmount) || 0)),
        status: entry.paymentStatus || "Pending", location: entry.location?.name || "-",
      }));
      const summary = rows.reduce((totals, row) => ({
        purchases: totals.purchases + row.amount, paid: totals.paid + row.paid, due: totals.due + row.due, units: totals.units + row.quantity + row.freeQuantity,
      }), { purchases: 0, paid: 0, due: 0, units: 0 });
      return response.json({ success: true, data: { rows: rows.slice(0, REPORT_ROW_LIMIT), summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, roundMoney(value)])), total, limited: total > REPORT_ROW_LIMIT, from, to } });
    }

    if (reportType === "profit" || reportType === "margin") {
      const sales = await getProfitSales(from, to, location);
      if (reportType === "profit") {
        const rows = sales.map((sale) => ({
          key: sale.key, date: sale.date, invoice: sale.invoice, source: sale.source, customer: sale.customer,
          items: sale.items, revenue: sale.revenue, cost: sale.cost, profit: sale.profit,
          marginPercent: sale.marginPercent, estimatedCost: sale.estimatedCost,
        }));
        const summary = rows.reduce((totals, row) => ({
          revenue: totals.revenue + row.revenue, cost: totals.cost + row.cost, profit: totals.profit + row.profit,
          transactions: totals.transactions + 1, estimatedTransactions: totals.estimatedTransactions + (row.estimatedCost ? 1 : 0),
        }), { revenue: 0, cost: 0, profit: 0, transactions: 0, estimatedTransactions: 0 });
        summary.marginPercent = summary.revenue ? roundMoney(summary.profit / summary.revenue * 100) : 0;
        Object.keys(summary).forEach((key) => { if (key !== "transactions" && key !== "estimatedTransactions") summary[key] = roundMoney(summary[key]); });
        return sendReportRows(response, rows, summary);
      }
      const products = new Map();
      sales.forEach((sale) => sale.products.forEach((item) => {
        const name = item.product || "Product";
        const key = item.productId || name.toLocaleLowerCase();
        const product = products.get(key) || { product: name, units: 0, revenue: 0, cost: 0, transactions: 0, estimatedTransactions: 0, invoices: new Set() };
        product.units += item.units;
        product.revenue += item.revenue;
        product.cost += item.cost;
        product.invoices.add(sale.invoice);
        if (sale.estimatedCost) product.estimatedTransactions += 1;
        products.set(key, product);
      }));
      const rows = [...products.values()].map((product) => {
        const revenue = roundMoney(product.revenue);
        const cost = roundMoney(product.cost);
        return {
          key: product.product, product: product.product, units: product.units, revenue, cost,
          profit: roundMoney(revenue - cost), marginPercent: revenue ? roundMoney((revenue - cost) / revenue * 100) : 0,
          transactions: product.invoices.size, estimatedCost: product.estimatedTransactions > 0,
        };
      }).sort((first, second) => second.profit - first.profit);
      const summary = rows.reduce((totals, row) => ({ revenue: totals.revenue + row.revenue, cost: totals.cost + row.cost, profit: totals.profit + row.profit, units: totals.units + row.units }), { revenue: 0, cost: 0, profit: 0, units: 0 });
      summary.marginPercent = summary.revenue ? roundMoney(summary.profit / summary.revenue * 100) : 0;
      ["revenue", "cost", "profit"].forEach((key) => { summary[key] = roundMoney(summary[key]); });
      return sendReportRows(response, rows, summary);
    }

    if (reportType === "top-products") {
      const [posSales, orders] = await Promise.all([
        PosSale.find(scopedFilter({ createdAt: dateFilter }, location ? { location: location._id } : null)).select("invoiceNumber items promotionDiscount").sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        Order.find(scopedFilter({ createdAt: dateFilter, status: { $ne: "Cancelled" }, paymentStatus: { $ne: "Failed" }, $or: [{ posInvoiceNumber: "" }, { posInvoiceNumber: { $exists: false } }] }, location ? { store: location._id } : null)).select("orderNumber items promoDiscount").sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
      ]);
      const products = new Map();
      const addProduct = (productId, name, quantity, freeQuantity, revenue, invoice) => {
        const label = name || "Product";
        const key = productId || label.toLocaleLowerCase();
        const product = products.get(key) || { product: label, units: 0, freeUnits: 0, revenue: 0, invoices: new Set() };
        product.units += Number(quantity) || 0;
        product.freeUnits += Number(freeQuantity) || 0;
        product.revenue += Number(revenue) || 0;
        product.invoices.add(invoice);
        products.set(key, product);
      };
      posSales.forEach((sale) => {
        const items = sale.items || [];
        const base = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        items.forEach((item) => {
          const lineRevenue = Number(item.amount) || 0;
          const promotionShare = base ? (Number(sale.promotionDiscount) || 0) * lineRevenue / base : 0;
          addProduct(entityId(item.product), item.productName, item.quantity, item.freeQuantity, Math.max(0, lineRevenue - promotionShare), sale.invoiceNumber);
        });
      });
      orders.forEach((order) => {
        const base = (order.items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
        (order.items || []).forEach((item) => {
          const lineRevenue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
          const promotionShare = base ? (Number(order.promoDiscount) || 0) * lineRevenue / base : 0;
          addProduct(entityId(item.product), item.name, item.quantity, 0, Math.max(0, lineRevenue - promotionShare), order.orderNumber);
        });
      });
      const rows = [...products.values()].map((product) => ({
        key: product.product, product: product.product, units: product.units, freeUnits: product.freeUnits,
        revenue: roundMoney(product.revenue), transactions: product.invoices.size,
      })).sort((first, second) => second.units - first.units || second.revenue - first.revenue);
      const summary = rows.reduce((totals, row) => ({ units: totals.units + row.units, revenue: totals.revenue + row.revenue, products: totals.products + 1 }), { units: 0, revenue: 0, products: 0 });
      summary.revenue = roundMoney(summary.revenue);
      return sendReportRows(response, rows, summary);
    }

    if (reportType === "vendor-ledger") {
      const [purchases, adjustments] = await Promise.all([
        Purchase.find(scopedFilter({ purchaseDate: dateFilter }, purchaseScope)).populate("vendor", "name").sort({ purchaseDate: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        PurchaseAdjustment.find(scopedFilter({ adjustmentDate: dateFilter, vendor: { $ne: null } }, location ? { location: location._id } : null)).populate("vendor", "name").sort({ adjustmentDate: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
      ]);
      const paymentFilter = { paymentDate: dateFilter };
      if (location) {
        const locationPurchaseIds = await Purchase.distinct("_id", scopedFilter({}, purchaseScope));
        paymentFilter.purchase = { $in: locationPurchaseIds };
      }
      const payments = await VendorPayment.find(paymentFilter).populate("vendor", "name").sort({ paymentDate: 1 }).limit(REPORT_ROW_LIMIT + 1).lean();
      const events = [
        ...purchases.map((entry) => ({ date: entry.purchaseDate, accountId: entityId(entry.vendor), account: entityName(entry.vendor), invoice: entry.invoiceNumber, description: `Purchase · ${entry.productName}`, debit: Number(entry.total) || 0, credit: 0 })),
        ...payments.map((entry) => ({ date: entry.paymentDate, accountId: entityId(entry.vendor), account: entityName(entry.vendor), invoice: entry.purchase ? "Payment" : "Advance payment", description: entry.notes || entry.paymentMode || "Vendor payment", debit: 0, credit: Number(entry.amount) || 0 })),
        ...adjustments.map((entry) => ({ date: entry.adjustmentDate, accountId: entityId(entry.vendor), account: entityName(entry.vendor), invoice: "Adjustment", description: entry.reason || "Balance adjustment", debit: Math.max(0, Number(entry.balanceAdjustment) || 0), credit: Math.max(0, -(Number(entry.balanceAdjustment) || 0)) })),
      ].filter((event) => event.accountId).sort((first, second) => String(first.account).localeCompare(String(second.account)) || new Date(first.date) - new Date(second.date));
      const balances = new Map();
      const rows = events.map((event, index) => {
        const balance = (balances.get(event.accountId) || 0) + event.debit - event.credit;
        balances.set(event.accountId, balance);
        return { key: `${event.accountId}-${index}`, date: event.date, account: event.account, invoice: event.invoice, description: event.description, debit: roundMoney(event.debit), credit: roundMoney(event.credit), balance: roundMoney(balance) };
      });
      const summary = rows.reduce((totals, row) => ({ debits: totals.debits + row.debit, credits: totals.credits + row.credit, entries: totals.entries + 1 }), { debits: 0, credits: 0, entries: 0 });
      summary.balance = roundMoney(summary.debits - summary.credits);
      summary.debits = roundMoney(summary.debits);
      summary.credits = roundMoney(summary.credits);
      return sendReportRows(response, rows, summary);
    }

    if (reportType === "customer-ledger") {
      const [orders, posSales] = await Promise.all([
        Order.find(scopedFilter({ status: { $ne: "Cancelled" }, paymentStatus: { $in: ["Paid", "Pending"] }, $and: [{ $or: [{ createdAt: dateFilter }, { paidAt: dateFilter }] }, { $or: [{ posInvoiceNumber: "" }, { posInvoiceNumber: { $exists: false } }] }] }, location ? { store: location._id } : null)).populate("customer", "name email").sort({ createdAt: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        PosSale.find(scopedFilter({ createdAt: dateFilter, customer: { $ne: null } }, location ? { location: location._id } : null)).populate("customer", "name email").sort({ createdAt: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
      ]);
      const events = [];
      orders.forEach((order) => {
        const accountId = entityId(order.customer);
        if (!accountId) return;
        const date = order.createdAt;
        const amount = Number(order.total) || 0;
        if (new Date(date) >= from && new Date(date) <= to) events.push({ date, accountId, account: entityName(order.customer), invoice: order.orderNumber, description: "Online order", debit: amount, credit: 0 });
        const paymentDate = order.paidAt || date;
        if (order.paymentStatus === "Paid" && new Date(paymentDate) >= from && new Date(paymentDate) <= to) events.push({ date: paymentDate, accountId, account: entityName(order.customer), invoice: order.orderNumber, description: "Payment received", debit: 0, credit: amount });
      });
      posSales.forEach((sale) => {
        const accountId = entityId(sale.customer);
        if (!accountId) return;
        const amount = Number(sale.total) || 0;
        events.push({ date: sale.createdAt, accountId, account: entityName(sale.customer, sale.customerName), invoice: sale.invoiceNumber, description: "POS sale", debit: amount, credit: 0 });
        if (sale.paymentStatus === "Paid") events.push({ date: sale.createdAt, accountId, account: entityName(sale.customer, sale.customerName), invoice: sale.invoiceNumber, description: "Payment received", debit: 0, credit: amount });
      });
      events.sort((first, second) => String(first.account).localeCompare(String(second.account)) || new Date(first.date) - new Date(second.date));
      const balances = new Map();
      const rows = events.map((event, index) => {
        const balance = (balances.get(event.accountId) || 0) + event.debit - event.credit;
        balances.set(event.accountId, balance);
        return { key: `${event.accountId}-${index}`, date: event.date, account: event.account, invoice: event.invoice, description: event.description, debit: roundMoney(event.debit), credit: roundMoney(event.credit), balance: roundMoney(balance) };
      });
      const summary = rows.reduce((totals, row) => ({ debits: totals.debits + row.debit, credits: totals.credits + row.credit, entries: totals.entries + 1 }), { debits: 0, credits: 0, entries: 0 });
      summary.balance = roundMoney(summary.debits - summary.credits);
      summary.debits = roundMoney(summary.debits);
      summary.credits = roundMoney(summary.credits);
      return sendReportRows(response, rows, summary);
    }

    if (reportType === "outstanding-customers") {
      const asOf = { $lte: to };
      const [orders, posSales] = await Promise.all([
        Order.find(scopedFilter({ createdAt: asOf, paymentStatus: { $in: ["Pending", "Paid"] }, $or: [{ posInvoiceNumber: "" }, { posInvoiceNumber: { $exists: false } }] }, location ? { store: location._id } : null)).populate("customer", "name email phone").sort({ createdAt: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        PosSale.find(scopedFilter({ createdAt: asOf, paymentStatus: "Pending", customer: { $ne: null } }, location ? { location: location._id } : null)).populate("customer", "name email phone").sort({ createdAt: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
      ]);
      const accounts = new Map();
      [...orders.filter((order) => {
        const cancelledByEndDate = order.status === "Cancelled" && (!order.cancelledAt || new Date(order.cancelledAt) <= to);
        const paidByEndDate = order.paymentStatus === "Paid" && (!order.paidAt || new Date(order.paidAt) <= to);
        return !cancelledByEndDate && !paidByEndDate;
      }).map((order) => ({ customer: order.customer, date: order.createdAt, invoice: order.orderNumber, due: order.total })), ...posSales.map((sale) => ({ customer: sale.customer, date: sale.createdAt, invoice: sale.invoiceNumber, due: sale.total }))].forEach((entry) => {
        const id = entityId(entry.customer);
        if (!id) return;
        const account = accounts.get(id) || { account: entityName(entry.customer), email: entry.customer.email || "-", phone: entry.customer.phone || "-", invoices: 0, outstanding: 0, oldestDue: entry.date };
        account.invoices += 1;
        account.outstanding += Number(entry.due) || 0;
        if (new Date(entry.date) < new Date(account.oldestDue)) account.oldestDue = entry.date;
        accounts.set(id, account);
      });
      const rows = [...accounts.entries()].map(([id, account]) => ({ key: id, ...account, outstanding: roundMoney(account.outstanding), status: "Outstanding" })).sort((first, second) => second.outstanding - first.outstanding);
      const summary = { accounts: rows.length, invoices: rows.reduce((sum, row) => sum + row.invoices, 0), outstanding: roundMoney(rows.reduce((sum, row) => sum + row.outstanding, 0)) };
      return sendReportRows(response, rows, summary);
    }

    if (reportType === "outstanding-vendors") {
      if (location) {
        const [purchases, adjustments] = await Promise.all([
          Purchase.find(scopedFilter({ purchaseDate: { $lte: to } }, purchaseScope)).select("vendor total paidAmount purchaseDate").sort({ purchaseDate: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
          PurchaseAdjustment.find({ location: location._id, adjustmentDate: { $lte: to }, vendor: { $ne: null } }).select("vendor balanceAdjustment").lean(),
        ]);
        const balances = new Map();
        purchases.forEach((purchase) => {
          const id = entityId(purchase.vendor);
          if (!id) return;
          const balance = balances.get(id) || { outstanding: 0, invoices: 0 };
          const due = Math.max(0, (Number(purchase.total) || 0) - (Number(purchase.paidAmount) || 0));
          balance.outstanding += due;
          if (due > 0) balance.invoices += 1;
          balances.set(id, balance);
        });
        adjustments.forEach((adjustment) => {
          const id = entityId(adjustment.vendor);
          if (!id) return;
          const balance = balances.get(id) || { outstanding: 0, invoices: 0 };
          balance.outstanding += Number(adjustment.balanceAdjustment) || 0;
          balances.set(id, balance);
        });
        const vendorIds = [...balances.keys()];
        const vendors = vendorIds.length ? await Vendor.find({ _id: { $in: vendorIds } }).select("name email phone").sort({ name: 1 }).lean() : [];
        const rows = vendors.map((vendor) => {
          const balance = balances.get(String(vendor._id));
          return { key: String(vendor._id), account: vendor.name, email: vendor.email || "-", phone: vendor.phone || "-", invoices: balance.invoices, outstanding: roundMoney(balance.outstanding), status: "Outstanding" };
        }).filter((vendor) => vendor.outstanding > 0).sort((first, second) => second.outstanding - first.outstanding);
        const summary = { accounts: rows.length, invoices: rows.reduce((sum, row) => sum + row.invoices, 0), outstanding: roundMoney(rows.reduce((sum, row) => sum + row.outstanding, 0)) };
        return sendReportRows(response, rows, summary);
      }
      const [vendors, purchases] = await Promise.all([
        Vendor.find({ pendingAmount: { $gt: 0 } }).sort({ pendingAmount: -1, name: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
        Purchase.find({ purchaseDate: { $lte: to }, paymentStatus: { $ne: "Paid" } }).select("vendor total paidAmount purchaseDate").sort({ purchaseDate: 1 }).limit(REPORT_ROW_LIMIT + 1).lean(),
      ]);
      const invoices = new Map();
      purchases.forEach((purchase) => {
        const id = entityId(purchase.vendor);
        if (id) invoices.set(id, (invoices.get(id) || 0) + 1);
      });
      const rows = vendors.map((vendor) => ({
        key: String(vendor._id), account: vendor.name, email: vendor.email || "-", phone: vendor.phone || "-",
        invoices: invoices.get(String(vendor._id)) || 0, outstanding: roundMoney(vendor.pendingAmount), status: "Outstanding",
      }));
      const summary = { accounts: rows.length, invoices: rows.reduce((sum, row) => sum + row.invoices, 0), outstanding: roundMoney(rows.reduce((sum, row) => sum + row.outstanding, 0)) };
      return sendReportRows(response, rows, summary);
    }

    return response.status(404).json({ success: false, message: "Report module not found." });
  } catch (error) {
    if (error.message === "Invalid report date range.") return response.status(400).json({ success: false, message: error.message });
    return next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const { from, to } = getDateRange(request);
    const baseFilter = { createdAt: { $gte: from, $lte: to }, status: { $ne: "Cancelled" } };
    const salesFilter = { ...baseFilter, paymentStatus: "Paid" };
    const [summary, trend, topProducts, repeatCustomers, customerCount] = await Promise.all([
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, promoSavings: { $sum: "$promoDiscount" } } },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.name" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 10 },
      ]),
      Order.aggregate([
        { $match: salesFilter },
        { $group: { _id: "$customer", orders: { $sum: 1 }, spent: { $sum: "$total" }, lastOrder: { $max: "$createdAt" } } },
        { $match: { orders: { $gte: 2 } } },
        { $sort: { orders: -1, spent: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "customer" } },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, orders: 1, spent: 1, lastOrder: 1, name: "$customer.name", email: "$customer.email" } },
      ]),
      User.countDocuments({ role: "customer" }),
    ]);

    const profit = await Order.aggregate([
      { $match: salesFilter },
      { $unwind: "$items" },
      { $set: { lineRevenue: { $multiply: ["$items.price", "$items.quantity"] }, lineCost: { $multiply: [{ $cond: [{ $gt: [{ $ifNull: ["$items.costPrice", 0] }, 0] }, "$items.costPrice", { $multiply: ["$items.price", 0.7] }] }, "$items.quantity"] } } },
      { $group: { _id: null, cost: { $sum: "$lineCost" }, profit: { $sum: { $subtract: ["$lineRevenue", "$lineCost"] } } } },
    ]);
    const totals = summary[0] || { revenue: 0, orders: 0, promoSavings: 0 };
    const profitTotals = profit[0] || { cost: 0, profit: 0 };
    response.json({ success: true, data: { from, to, totals: { ...totals, customers: customerCount, cost: profitTotals.cost, profit: profitTotals.profit }, trend, topProducts, repeatCustomers } });
  } catch (error) {
    if (error.message === "Invalid report date range.") return response.status(400).json({ success: false, message: error.message });
    return next(error);
  }
});

module.exports = router;
