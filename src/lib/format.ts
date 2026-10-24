const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** 화면에 보이는 금액은 항상 USD(en-US)로 표시한다. */
export const formatUsd = (amount: number): string => usd.format(amount);
