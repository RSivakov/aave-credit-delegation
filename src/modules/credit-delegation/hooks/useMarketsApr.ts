import { useEffect, useState } from 'react';

export interface MarketApr {
  id: string;
  marketId: string;
  capitalToken: string;
  premiumToken: string;
  apy: string;
  quotePerSecond: string;
}

export const useMarketsApr = (): MarketApr[] | undefined => {
  const [marketsApr, setMarketsApr] = useState<MarketApr[]>();

  useEffect(() => {
    let isNotCancelled = true;

    async function getApr() {
      const url = `${process.env.NEXT_PUBLIC_ATOMICA_API_URL}v1/deployments/all/products/all/markets/all/quote`;

      try {
        const response = await fetch(url);

        if (response.ok) {
          const json: {
            markets: MarketApr[];
          }[] = await response.json();

          if (isNotCancelled) {
            setMarketsApr(json[0].markets);
          }
        }
      } catch {}
    }

    getApr();

    return () => {
      isNotCancelled = false;
    };
  }, []);

  return marketsApr;
};
