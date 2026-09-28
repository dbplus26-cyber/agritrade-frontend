import type { IDebtorRow } from "@/types/report.types";
import type {
  IDriverPayment,
  IDriverPaymentLedgerRow,
  IExpensePayment,
} from "@/types/driver-settlement.types";
import type { IApproval } from "@/types/approval.types";
import { csvColumns } from "@/lib/csv-export";
import type { IPurchase, IPurchasePayment } from "@/types/purchase.types";
import type { ISale, ISalePayment } from "@/types/admin-sale.types";
import type { IShipment } from "@/types/admin-shipment.types";
import type { IExpense } from "@/types/expense.types";
import type {
  IStockBalance,
  IStockMovement,
  ISupplierHolding,
} from "@/types/stock.types";
import type {
  IGrantAgingRow,
  IStocktake,
  IStocktakeLine,
  ITransfer,
} from "@/types/ops.types";
import type {
  IFarmer,
  IFarmerBalance,
  IGrant,
  IInputItem,
  IRepayment,
  ISeason,
} from "@/types/farm.types";
import type {
  ILandAcquisition,
  ILandAcquisitionPayment,
  ILandPlot,
  ILandSale,
  ILandSalePayment,
  ILandSeller,
} from "@/types/land.types";
import type {
  IBuyer,
  ICommodity,
  IExpenseCategory,
  ISupplier,
  IWarehouse,
} from "@/types/registry.types";
import type { IDeliveryAddress, IDriver } from "@/types/logistics.types";
import type { IAgentSummary, IFloatHolder } from "@/types/agent.types";
import type { IUser } from "@/types/user.types";
import type { IAuditLog } from "@/types/audit.types";
import type {
  IAccountMovement,
  IPaymentAccount,
} from "@/types/payment-account.types";
import type { IAccountBalance, ILedgerRow } from "@/types/cashbook.types";
import type {
  IBalanceTransfer,
  IDisbursement,
} from "@/types/disbursement.types";
import type { IDrawing, IFixedAsset } from "@/types/statement.types";
import type { IAdminEnquiry, IAdminFarmApplication } from "@/types/inbox.types";

export const purchasesCsvColumns = csvColumns<IPurchase>([
  ["Reference", "transactionNo"],
  ["Date", "purchasedAt"],
  ["Status", "status"],
  ["Source", "source"],
  ["Commodity", "commodity.name"],
  ["Supplier", "supplier.name"],
  ["Agent", "agent.name"],
  ["Warehouse", "warehouse.name"],
  ["Weight (kg)", "weightKg"],
  ["Received (kg)", "receivedKg"],
  ["Variance (kg)", "varianceKg"],
  ["Unit price (GHS)", "unitPriceGhs"],
  ["Total (GHS)", "totalGhs"],
  ["Paid (GHS)", "settlement.paidGhs"],
  ["Outstanding (GHS)", "settlement.outstandingGhs"],
  ["Settlement", "settlement.status"],
  ["Notes", "notes"],
]);

export const salesCsvColumns = csvColumns<ISale>([
  ["Reference", "transactionNo"],
  ["Created", "createdAt"],
  ["Buyer", "buyer.name"],
  ["Status", "status"],
  ["Agreed total (GHS)", "agreedTotalGhs"],
  ["Settled total (GHS)", "settledTotalGhs"],
  ["Paid (GHS)", "paidGhs"],
  ["Balance (GHS)", "balanceGhs"],
  ["Payment policy", "paymentPolicy.name"],
  ["Notes", "notes"],
]);

export const shipmentsCsvColumns = csvColumns<IShipment>([
  ["Reference", "transactionNo"],
  ["Created", "createdAt"],
  ["Status", "status"],
  ["Warehouse", "originWarehouse.name"],
  ["Destination", "destination"],
  ["Truck", "truckReg"],
  ["Driver", "driverName"],
  ["Driver phone", "driverPhone"],
  ["Weight (kg)", "totalWeightKg"],
  ["Planned (kg)", "plannedWeightKg"],
  ["Departed", "departedAt"],
  ["Arrived", "arrivedAt"],
  ["Revenue (GHS)", "profit.revenueGhs"],
  ["Cost (GHS)", "profit.costGhs"],
  ["Expenses (GHS)", "profit.expensesGhs"],
  ["Profit (GHS)", "profit.profitGhs"],
  ["Notes", "notes"],
]);

export const expensesCsvColumns = csvColumns<IExpense>([
  ["Reference", "transactionNo"],
  ["Date", "incurredAt"],
  ["Category", "category.name"],
  ["Description", "description"],
  ["Trip", "shipment.transactionNo"],
  ["Amount (GHS)", "amountGhs"],
  ["Paid (GHS)", "settlement.paidGhs"],
  ["Outstanding (GHS)", "settlement.outstandingGhs"],
  ["Settlement", "settlement.status"],
  ["Voided", "voidedAt"],
  ["Void reason", "voidReason"],
]);

export const stockBalancesCsvColumns = csvColumns<IStockBalance>([
  ["Warehouse", "warehouseName"],
  ["Commodity", "commodityName"],
  ["Balance (kg)", "balanceKg"],
]);

export const supplierHoldingsCsvColumns = csvColumns<ISupplierHolding>([
  ["Supplier", "supplierName"],
  ["Commodity", "commodityName"],
  ["Lots", "lots"],
  ["Remaining (kg)", "remainingKg"],
]);

export const stockMovementsCsvColumns = csvColumns<IStockMovement>([
  ["Date", "occurredAt"],
  ["Type", "type"],
  ["Warehouse", "warehouse.name"],
  ["Commodity", "commodity.name"],
  ["Movement (kg)", "deltaKg"],
  ["Reason", "reason"],
]);

export const transfersCsvColumns = csvColumns<ITransfer>([
  ["Reference", "transactionNo"],
  ["Date", "occurredAt"],
  ["From warehouse", "fromWarehouse.name"],
  ["To warehouse", "toWarehouse.name"],
  ["Commodity", "commodity.name"],
  ["Weight (kg)", "weightKg"],
  ["Notes", "notes"],
]);

export const stocktakesCsvColumns = csvColumns<IStocktake>([
  ["Reference", "transactionNo"],
  ["Warehouse", "warehouse.name"],
  ["Status", "status"],
  ["Created", "createdAt"],
  ["Submitted", "submittedAt"],
  ["Decided", "decidedAt"],
  ["Notes", "notes"],
]);

export const stocktakeLinesCsvColumns = csvColumns<IStocktakeLine>([
  ["Commodity", "commodity.name"],
  ["Counted (kg)", "countedKg"],
  ["Book quantity (kg)", "derivedKg"],
  ["Variance (kg)", "deltaKg"],
]);

export const farmersCsvColumns = csvColumns<IFarmer>([
  ["Name", "name"],
  ["Phone", "phone"],
  ["Community", "community"],
  ["Farm location", "farmLocation"],
  ["Farm size (acres)", "farmSizeAcres"],
  ["Active", "isActive"],
  ["Created", "createdAt"],
  ["Notes", "notes"],
]);

export const grantsCsvColumns = csvColumns<IGrant>([
  ["Reference", "transactionNo"],
  ["Date", "grantedAt"],
  ["Farmer", "farmer.name"],
  ["Season", "season.name"],
  ["Item", "item.name"],
  ["Unit", "item.unitLabel"],
  ["Quantity", "quantity"],
  ["Value (GHS)", "valueGhs"],
  ["Due", "dueDate"],
  ["Terms", "agreedTerms"],
  ["Notes", "notes"],
]);

export const repaymentsCsvColumns = csvColumns<IRepayment>([
  ["Reference", "transactionNo"],
  ["Date", "receivedAt"],
  ["Farmer", "farmer.name"],
  ["Season", "season.name"],
  ["Kind", "kind"],
  ["Commodity", "commodity.name"],
  ["Weight (kg)", "weightKg"],
  ["Rate per kg (GHS)", "ratePerKgGhs"],
  ["Value (GHS)", "valueGhs"],
  ["Into stock", "intoStock"],
  ["Received by", "receivedByName"],
  ["Notes", "notes"],
]);

export const seasonsCsvColumns = csvColumns<ISeason>([
  ["Name", "name"],
  ["Starts", "startsOn"],
  ["Ends", "endsOn"],
  ["Active", "isActive"],
  ["Description", "description"],
]);

export const inputItemsCsvColumns = csvColumns<IInputItem>([
  ["Name", "name"],
  ["Unit", "unitLabel"],
  ["Active", "isActive"],
  ["Description", "description"],
]);

export const grantAgingCsvColumns = csvColumns<IGrantAgingRow>([
  ["Farmer", "farmer.name"],
  ["Phone", "farmer.phone"],
  ["Season", "season.name"],
  ["Invested (GHS)", "investedGhs"],
  ["Recovered (GHS)", "recoveredGhs"],
  ["Outstanding (GHS)", "outstandingGhs"],
  ["Due", "dueDate"],
  ["Days overdue", "daysOverdue"],
  ["Bucket", "bucket"],
]);

export const plotsCsvColumns = csvColumns<ILandPlot>([
  ["Reference", "reference"],
  ["Location", "locationText"],
  ["Size", "sizeText"],
  ["Size (acres)", "sizeAcres"],
  ["Use", "use"],
  ["Status", "status"],
  ["Asking price (GHS)", "askingPriceGhs"],
  ["Purchase cost (GHS)", "purchaseCostGhs"],
  ["Margin (GHS)", "marginGhs"],
  ["Published", "publishToWebsite"],
]);

export const landSalesCsvColumns = csvColumns<ILandSale>([
  ["Reference", "transactionNo"],
  ["Created", "createdAt"],
  ["Status", "status"],
  ["Plot", "plot.reference"],
  ["Location", "plot.locationText"],
  ["Buyer", "buyer.name"],
  ["Agreed price (GHS)", "agreedPriceGhs"],
  ["Paid (GHS)", "paidGhs"],
  ["Balance (GHS)", "balanceGhs"],
  ["Forfeited (GHS)", "forfeitedGhs"],
  ["Margin (GHS)", "marginGhs"],
  ["Notes", "notes"],
]);

export const landAcquisitionsCsvColumns = csvColumns<ILandAcquisition>([
  ["Reference", "transactionNo"],
  ["Parcel reference", "reference"],
  ["Created", "createdAt"],
  ["Seller", "seller.name"],
  ["Location", "locationText"],
  ["Size", "sizeText"],
  ["Size (acres)", "sizeAcres"],
  ["Status", "status"],
  ["Agreed cost (GHS)", "agreedCostGhs"],
  ["Paid (GHS)", "paidGhs"],
  ["Balance (GHS)", "balanceGhs"],
  ["Plot", "plot.reference"],
  ["Notes", "notes"],
]);

export const landSellersCsvColumns = csvColumns<ILandSeller>([
  ["Name", "name"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Community", "community"],
  ["Active", "isActive"],
  ["Notes", "notes"],
]);

export const buyersCsvColumns = csvColumns<IBuyer>([
  ["Name", "name"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["City", "city"],
  ["Business", "businessName"],
  ["Contact", "contactPersonName"],
  ["Contact phone", "contactPersonPhone"],
  ["Active", "isActive"],
  ["Notes", "notes"],
]);

export const suppliersCsvColumns = csvColumns<ISupplier>([
  ["Name", "name"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Community", "community"],
  ["Source", "sourceType"],
  ["Active", "isActive"],
  ["Notes", "notes"],
]);

export const commoditiesCsvColumns = csvColumns<ICommodity>([
  ["Name", "name"],
  ["Variety", "variety"],
  ["Grade", "qualityGrade"],
  ["Bag weight (kg)", "bagWeightKg"],
  ["Active", "isActive"],
  ["Published", "publishToWebsite"],
  ["Description", "description"],
]);

export const warehousesCsvColumns = csvColumns<IWarehouse>([
  ["Name", "name"],
  ["Location", "location"],
  ["Active", "isActive"],
  ["Description", "description"],
]);

export const expenseCategoriesCsvColumns = csvColumns<IExpenseCategory>([
  ["Name", "name"],
  ["Statement section", "statementSection"],
  ["Statement heading", "statementHeading"],
  ["Active", "isActive"],
  ["Description", "description"],
]);

export const driversCsvColumns = csvColumns<IDriver>([
  ["Name", "name"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Company", "company"],
  ["City", "city"],
  ["Active", "isActive"],
  ["Notes", "notes"],
]);

export const deliveryAddressesCsvColumns = csvColumns<IDeliveryAddress>([
  ["Label", "label"],
  ["City", "city"],
  ["Area", "area"],
  ["Digital address", "digitalAddress"],
  ["Landmark", "landmark"],
  ["Shop", "shopName"],
  ["Contact", "contactName"],
  ["Phone", "contactPhone"],
  ["Active", "isActive"],
  ["Directions", "directions"],
]);

export const agentsCsvColumns = csvColumns<IAgentSummary>([
  ["First name", "firstName"],
  ["Last name", "lastName"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Region", "region"],
  ["Active", "isActive"],
  ["Balance (GHS)", "balanceGhs"],
]);

export const floatHoldersCsvColumns = csvColumns<IFloatHolder>([
  ["First name", "firstName"],
  ["Last name", "lastName"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Role", "role"],
  ["Region", "region"],
  ["Active", "isActive"],
  ["Balance (GHS)", "balanceGhs"],
]);

export const usersCsvColumns = csvColumns<IUser>([
  ["First name", "firstName"],
  ["Last name", "lastName"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Role", "role"],
  ["Active", "isActive"],
  ["Last login", "lastLoginAt"],
  ["Created", "createdAt"],
]);

export const auditCsvColumns = csvColumns<IAuditLog>([
  ["Date", "createdAt"],
  ["Actor", "actor.name"],
  ["Actor email", "actor.email"],
  ["Action", "action"],
  ["Entity", "entity"],
  ["Entity ID", "entityId"],
]);

export const paymentAccountsCsvColumns = csvColumns<IPaymentAccount>([
  ["Label", "label"],
  ["Kind", "kind"],
  ["Account name", "accountName"],
  ["Account number", "accountNumber"],
  ["Bank", "bankName"],
  ["Provider", "provider"],
  ["Active", "isActive"],
  ["On invoices", "showOnInvoice"],
]);

export const accountPaymentsCsvColumns = csvColumns<IAccountMovement>([
  ["Reference", "transactionNo"],
  ["Date", "paidAt"],
  ["Source", "source"],
  ["Document", "parentNo"],
  ["Counterparty", "counterparty"],
  ["Direction", "direction"],
  ["Method", "method"],
  ["Amount (GHS)", "amountGhs"],
  ["Payment reference", "reference"],
  ["Reversal", "isReversal"],
]);

export const accountLedgerCsvColumns = csvColumns<ILedgerRow>([
  ["Reference", "transactionNo"],
  ["Date", "paidAt"],
  ["Source", "source"],
  ["Document", "parentNo"],
  ["Counterparty", "counterparty"],
  ["Direction", "direction"],
  ["Method", "method"],
  ["Amount (GHS)", "amountGhs"],
  ["Balance (GHS)", "balanceGhs"],
  ["Payment reference", "reference"],
  ["Reversal", "isReversal"],
]);

export const disbursementsCsvColumns = csvColumns<IDisbursement>([
  ["Reference", "transactionNo"],
  ["Created", "createdAt"],
  ["Recipient", "recipientName"],
  ["Phone", "recipientMsisdn"],
  ["Rail", "rail"],
  ["Channel", "channel"],
  ["Bank", "bankName"],
  ["Status", "status"],
  ["Amount (GHS)", "amountGhs"],
  ["Charges (GHS)", "chargesGhs"],
  ["Debited (GHS)", "amountDebitedGhs"],
  ["Requested by", "requestedByName"],
  ["Settled", "settledAt"],
  ["Description", "description"],
]);

export const drawingsCsvColumns = csvColumns<IDrawing>([
  ["Reference", "transactionNo"],
  ["Date", "occurredAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Notes", "notes"],
]);

export const fixedAssetsCsvColumns = csvColumns<IFixedAsset>([
  ["Name", "name"],
  ["Class", "className"],
  ["Acquired", "acquiredAt"],
  ["Cost (GHS)", "costGhs"],
  ["Disposed", "disposedAt"],
  ["Disposal proceeds (GHS)", "disposalProceedsGhs"],
  ["Notes", "notes"],
]);

export const enquiriesCsvColumns = csvColumns<IAdminEnquiry>([
  ["Reference", "reference"],
  ["Received", "receivedAt"],
  ["Name", "fullName"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Subject", "subject"],
  ["Status", "status"],
  ["Message", "message"],
]);

export const farmApplicationsCsvColumns = csvColumns<IAdminFarmApplication>([
  ["Reference", "reference"],
  ["Created", "createdAt"],
  ["Name", "name"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Community", "community"],
  ["Farm location", "farmLocation"],
  ["Farm size (acres)", "farmSizeAcres"],
  ["Crops", "crops"],
  ["Items needed", "itemsNeeded"],
  ["Status", "status"],
]);

export const treasuryTransfersCsvColumns = csvColumns<IBalanceTransfer>([
  ["Reference", "transactionNo"],
  ["Created", "createdAt"],
  ["Status", "status"],
  ["Amount (GHS)", "amountGhs"],
  ["Requested by", "requestedByName"],
  ["Settled", "settledAt"],
  ["Description", "description"],
]);
export const farmerBalancesCsvColumns = csvColumns<IFarmerBalance>([
  ["Farmer", "farmerName"],
  ["Invested (GHS)", "investedGhs"],
  ["Recovered (GHS)", "recoveredGhs"],
  ["Outstanding (GHS)", "outstandingGhs"],
]);
export const cashBookCsvColumns = csvColumns<IAccountBalance>([
  ["Account", "label"],
  ["Kind", "kind"],
  ["Active", "isActive"],
  ["Balance (GHS)", "balanceGhs"],
]);
export const approvalsCsvColumns = csvColumns<IApproval>([
  ["Requested", "createdAt"],
  ["Document", "sourceRef"],
  ["Subject", "subject"],
  ["Action", "action"],
  ["Status", "status"],
  ["Counterparty", "counterparty"],
  ["Warehouse", "warehouse"],
  ["Amount", "amount", true],
  ["Currency", "currency"],
  ["Quantity", "quantity"],
  ["Unit", "unit"],
  ["Unit price", "unitPrice", true],
  ["Requested by", "requestedBy.name"],
  ["Decided by", "decidedBy.name"],
  ["Decided", "decidedAt"],
  ["Note", "note"],
]);

export const purchasePaymentsCsvColumns = csvColumns<IPurchasePayment>([
  ["Reference", "transactionNo"],
  ["Paid at", "paidAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Method", "method"],
  ["Payment reference", "reference"],
  ["Account", "paymentAccount.label"],
  ["From float", "fromFloat"],
  ["Reversal", "isReversal"],
  ["Reversal reason", "reversalReason"],
]);

export const expensePaymentsCsvColumns = csvColumns<IExpensePayment>([
  ["Reference", "transactionNo"],
  ["Paid at", "paidAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Method", "method"],
  ["Payment reference", "reference"],
  ["Account", "paymentAccount.label"],
  ["Source", "sourceType"],
  ["Reversal", "isReversal"],
  ["Reversal reason", "reversalReason"],
]);

export const driverPaymentsCsvColumns = csvColumns<IDriverPayment>([
  ["Reference", "transactionNo"],
  ["Paid at", "paidAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Method", "method"],
  ["Payment reference", "reference"],
  ["Account", "paymentAccount.label"],
  ["Reversal", "isReversal"],
  ["Reversal reason", "reversalReason"],
]);

export const driverPaymentHistoryCsvColumns =
  csvColumns<IDriverPaymentLedgerRow>([
    ["Reference", "transactionNo"],
    ["Paid at", "paidAt"],
    ["Amount (GHS)", "amountGhs"],
    ["Method", "method"],
    ["Payment reference", "reference"],
    ["Trip", "shipment.transactionNo"],
    ["Destination", "shipment.destination"],
    ["Account", "paymentAccount.label"],
    ["Reversal", "isReversal"],
    ["Reversal reason", "reversalReason"],
  ]);

export const salePaymentsCsvColumns = csvColumns<ISalePayment>([
  ["Reference", "transactionNo"],
  ["Paid at", "paidAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Method", "method"],
  ["Payment reference", "reference"],
  ["Reverses payment ID", "reversesId"],
  ["Reversal reason", "reversalReason"],
]);

export const landSalePaymentsCsvColumns = csvColumns<ILandSalePayment>([
  ["Reference", "transactionNo"],
  ["Paid at", "paidAt"],
  ["Amount (GHS)", "amountGhs"],
  ["Method", "method"],
  ["Payment reference", "reference"],
]);

export const acquisitionPaymentsCsvColumns =
  csvColumns<ILandAcquisitionPayment>([
    ["Reference", "transactionNo"],
    ["Paid at", "paidAt"],
    ["Amount (GHS)", "amountGhs"],
    ["Method", "method"],
    ["Payment reference", "reference"],
  ]);

export const debtorsCsvColumns = csvColumns<IDebtorRow>([
  ["Book", "kind"],
  ["Buyer", "buyer.name"],
  ["Phone", "buyer.phone"],
  ["Subject", "subject"],
  ["Status", "status"],
  ["Agreed (GHS)", "agreedGhs"],
  ["Paid (GHS)", "paidGhs"],
  ["Balance (GHS)", "balanceGhs"],
]);
