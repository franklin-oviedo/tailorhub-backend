export enum InvoiceStatusEnum {
    DRAFT = 'draft',
    ISSUED = 'issued',
    PARTIALLY_PAID = 'partially_paid',
    PAID = 'paid',
    CANCELLED = 'cancelled',
    CREDITED = 'credited',
}

export enum DiscountTypeEnum {
    PERCENTAGE = 'percentage',
    FIXED_AMOUNT = 'fixed_amount',
}

export enum FiscalDocumentTypeEnum {
    CONSUMER = 'consumer',
    CREDIT_FISCAL = 'credit_fiscal',
    GOVERNMENT = 'government',
    SPECIAL = 'special',
    E31_CREDIT_FISCAL = 'e31_credit_fiscal',
    E32_CONSUMER = 'e32_consumer',
    E33_DEBIT_NOTE = 'e33_debit_note',
    E34_CREDIT_NOTE = 'e34_credit_note',
}

export enum PaymentMethodEnum {
    CASH = 'cash',
    CARD = 'card',
    BANK_TRANSFER = 'bank_transfer',
    OTHER = 'other',
}