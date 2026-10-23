import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscountTypeEnum } from '../enums/invoice.enum';

export type InvoiceCalculationLineInput = {
  id?: string;
  orderItemId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType?: DiscountTypeEnum | null;
  discountValue?: number;
  isTaxable?: boolean;
  taxRate?: number;
  snapshot?: Record<string, unknown> | null;
};

export type InvoiceCalculationLineResult = {
  id?: string;
  orderItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountTypeEnum | null;
  discountValue: number;
  discountAmount: number;
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  isTaxable: boolean;
  snapshot: Record<string, unknown> | null;
};

export type InvoiceCalculationResult = {
  lines: InvoiceCalculationLineResult[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  taxAmount: number;
  total: number;
};

@Injectable()
export class InvoiceCalculationService {
  private readonly defaultTaxRate: number;
  private readonly defaultCurrency: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultTaxRate = Number(
      this.configService.get<string>('BILLING_DEFAULT_TAX_RATE', '18'),
    );
    this.defaultCurrency = this.configService
      .get<string>('BILLING_DEFAULT_CURRENCY', 'DOP')
      .toUpperCase();
  }

  getDefaultTaxRate(): number {
    return this.defaultTaxRate;
  }

  getDefaultCurrency(): string {
    return this.defaultCurrency;
  }

  normalizeAmount(value: number): number {
    return this.centsToAmount(this.amountToCents(value));
  }

  calculateInvoice(
    lines: InvoiceCalculationLineInput[],
    invoiceDiscountType?: DiscountTypeEnum | null,
    invoiceDiscountValue?: number,
  ): InvoiceCalculationResult {
    if (!lines.length) {
      throw new BadRequestException('Invoice must contain at least one item.');
    }

    const lineResults = lines.map((line) => this.calculateLine(line));
    const subtotalCents = lineResults.reduce((acc, line) => acc + line.subtotalCents, 0n);
    const lineDiscountCents = lineResults.reduce(
      (acc, line) => acc + line.discountAmountCents,
      0n,
    );
    const taxableCents = lineResults.reduce((acc, line) => acc + line.taxableBaseCents, 0n);
    const exemptCents = lineResults.reduce((acc, line) => acc + line.exemptAmountCents, 0n);
    const taxCents = lineResults.reduce((acc, line) => acc + line.taxAmountCents, 0n);
    const totalBeforeInvoiceDiscountCents = lineResults.reduce(
      (acc, line) => acc + line.lineTotalCents,
      0n,
    );

    const invoiceDiscountCents = this.calculateDiscountAmountCents(
      totalBeforeInvoiceDiscountCents,
      invoiceDiscountType,
      invoiceDiscountValue,
      'invoice',
    );

    if (invoiceDiscountCents > totalBeforeInvoiceDiscountCents) {
      throw new BadRequestException('Invoice discount cannot exceed invoice total.');
    }

    const totalCents = totalBeforeInvoiceDiscountCents - invoiceDiscountCents;

    return {
      lines: lineResults.map((line) => ({
        id: line.id,
        orderItemId: line.orderItemId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: this.centsToAmount(line.unitPriceCents),
        discountType: line.discountType,
        discountValue: line.discountValue,
        discountAmount: this.centsToAmount(line.discountAmountCents),
        taxableBase: this.centsToAmount(line.taxableBaseCents),
        taxRate: line.taxRate,
        taxAmount: this.centsToAmount(line.taxAmountCents),
        lineTotal: this.centsToAmount(line.lineTotalCents),
        isTaxable: line.isTaxable,
        snapshot: line.snapshot,
      })),
      subtotal: this.centsToAmount(subtotalCents),
      discountAmount: this.centsToAmount(lineDiscountCents + invoiceDiscountCents),
      taxableAmount: this.centsToAmount(taxableCents),
      exemptAmount: this.centsToAmount(exemptCents),
      taxAmount: this.centsToAmount(taxCents),
      total: this.centsToAmount(totalCents),
    };
  }

  private calculateLine(line: InvoiceCalculationLineInput) {
    const quantity = this.validateIntegerQuantity(line.quantity);
    const unitPriceCents = this.amountToCents(line.unitPrice);
    const subtotalCents = unitPriceCents * BigInt(quantity);
    const discountType = line.discountType ?? null;
    const discountValue = line.discountValue ?? 0;
    const discountAmountCents = this.calculateDiscountAmountCents(
      subtotalCents,
      discountType,
      discountValue,
      'line',
    );

    if (discountAmountCents > subtotalCents) {
      throw new BadRequestException('Line discount cannot exceed line subtotal.');
    }

    const taxableBaseCents = subtotalCents - discountAmountCents;
    const isTaxable = line.isTaxable ?? true;
    const taxRate = line.taxRate ?? this.defaultTaxRate;
    const taxRateBasisPoints = this.percentToBasisPoints(taxRate);

    if (!isTaxable && taxRate !== 0 && line.taxRate !== undefined) {
      throw new BadRequestException('Exempt lines cannot define a tax rate.');
    }

    const taxAmountCents = isTaxable
      ? this.roundHalfUp(taxableBaseCents * BigInt(taxRateBasisPoints), 10000n)
      : 0n;

    const lineTotalCents = taxableBaseCents + taxAmountCents;
    const exemptAmountCents = isTaxable ? 0n : taxableBaseCents;

    return {
      id: line.id,
      orderItemId: line.orderItemId ?? null,
      description: line.description,
      quantity,
      unitPriceCents,
      discountType,
      discountValue,
      discountAmountCents,
      taxableBaseCents,
      taxRate: isTaxable ? taxRate : 0,
      taxAmountCents,
      lineTotalCents,
      isTaxable,
      snapshot: line.snapshot ?? null,
      subtotalCents,
      exemptAmountCents,
    };
  }

  private validateIntegerQuantity(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Item quantity must be a positive integer.');
    }

    return quantity;
  }

  private calculateDiscountAmountCents(
    baseCents: bigint,
    discountType: DiscountTypeEnum | null | undefined,
    discountValue: number | undefined,
    level: 'line' | 'invoice',
  ): bigint {
    if (!discountType || discountValue === undefined || discountValue === 0) {
      return 0n;
    }

    if (discountValue < 0) {
      throw new BadRequestException(`${level} discount cannot be negative.`);
    }

    if (discountType === DiscountTypeEnum.PERCENTAGE) {
      const basisPoints = this.percentToBasisPoints(discountValue);
      if (basisPoints > 10000) {
        throw new BadRequestException(`${level} discount percentage must be between 0 and 100.`);
      }

      return this.roundHalfUp(baseCents * BigInt(basisPoints), 10000n);
    }

    const fixedDiscountCents = this.amountToCents(discountValue);
    if (fixedDiscountCents > baseCents) {
      throw new BadRequestException(`${level} fixed discount cannot exceed its base amount.`);
    }

    return fixedDiscountCents;
  }

  private roundHalfUp(value: bigint, divisor: bigint): bigint {
    const quotient = value / divisor;
    const remainder = value % divisor;
    return remainder * 2n >= divisor ? quotient + 1n : quotient;
  }

  private amountToCents(value: number): bigint {
    return this.toScaledBigInt(value, 2);
  }

  private percentToBasisPoints(value: number): number {
    const basisPoints = Number(this.toScaledBigInt(value, 2));
    if (basisPoints < 0 || basisPoints > 10000) {
      throw new BadRequestException('Percentage value must be between 0 and 100.');
    }

    return basisPoints;
  }

  private centsToAmount(cents: bigint): number {
    return Number(cents) / 100;
  }

  private toScaledBigInt(value: number, scale: number): bigint {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Numeric value must be finite.');
    }

    let numericString = value.toString();
    if (numericString.includes('e') || numericString.includes('E')) {
      numericString = value.toFixed(scale + 6);
    }

    const sign = numericString.startsWith('-') ? -1n : 1n;
    const unsigned = numericString.replace('-', '');
    const [wholePartRaw, fractionalRaw = ''] = unsigned.split('.');
    const wholePart = wholePartRaw.length ? wholePartRaw : '0';

    if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionalRaw)) {
      throw new BadRequestException('Invalid numeric value.');
    }

    const padded = fractionalRaw.padEnd(scale + 1, '0');
    const mainFraction = padded.slice(0, scale);
    const roundingDigit = Number(padded.charAt(scale) || '0');

    let scaled = BigInt(wholePart) * 10n ** BigInt(scale) + BigInt(mainFraction || '0');
    if (roundingDigit >= 5) {
      scaled += 1n;
    }

    return scaled * sign;
  }
}
