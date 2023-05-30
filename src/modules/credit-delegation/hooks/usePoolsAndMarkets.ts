import { API_ETH_MOCK_ADDRESS, InterestRate } from '@aave/contract-helpers';
import { normalize, USD_DECIMALS, valueToBigNumber } from '@aave/math-utils';
import { useQuery } from '@apollo/client';
import { BigNumber } from 'bignumber.js';
import { loader } from 'graphql.macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComputedReserveData,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useRootStore } from 'src/store/root';
import { fetchIconSymbolAndName } from 'src/ui-config/reservePatches';
import {
  assetCanBeBorrowedByUser,
  getMaxAmountAvailableToBorrow,
} from 'src/utils/getMaxAmountAvailableToBorrow';

import {
  AtomicaBorrowMarket,
  AtomicaDelegationPool,
  AtomicaSubgraphMarket,
  AtomicaSubgraphPool,
} from '../types';
import { usePoolsMetadata } from './usePoolsMetadata';
import { useUserVaults } from './useUserVaults';

const MAIN_QUERY = loader('../queries/main.gql');

type ApproveCredit = Record<string, { amount: string; amountUsd: string; amountUsdBig: BigNumber }>;

export const usePoolsAndMarkets = () => {
  const {
    user,
    reserves,
    marketReferencePriceInUsd,
    loading: appDataLoading,
  } = useAppDataContext();
  const { currentNetworkConfig } = useProtocolDataContext();
  const { walletBalances } = useWalletBalances();
  const getCreditDelegationApprovedAmount = useRootStore(
    (state) => state.getCreditDelegationApprovedAmount
  );
  const metadata = usePoolsMetadata();

  const [approvedCredit, setApprovedCredit] = useState<ApproveCredit>({});
  const [approvedCreditLoading, setApprovedCreditLoading] = useState<boolean>(false);
  const [approvedCreditLoaded, setApprovedCreditLoaded] = useState<boolean>(false);

  const { loading: loadingVaults, vaults, refetch: refetchVaults } = useUserVaults();

  const { baseAssetSymbol } = currentNetworkConfig;

  const tokensToBorrow = reserves
    .filter((reserve) => assetCanBeBorrowedByUser(reserve, user))
    .map((reserve: ComputedReserveData) => {
      const availableBorrows = user
        ? Number(getMaxAmountAvailableToBorrow(reserve, user, InterestRate.Variable))
        : 0;

      const availableBorrowsInUSD = valueToBigNumber(availableBorrows)
        .multipliedBy(reserve.formattedPriceInMarketReferenceCurrency)
        .multipliedBy(marketReferencePriceInUsd)
        .shiftedBy(-USD_DECIMALS)
        .toFixed(2);

      return {
        ...reserve,
        reserve,
        totalBorrows: reserve.totalDebt,
        availableBorrows,
        availableBorrowsInUSD,
        stableBorrowRate:
          reserve.stableBorrowRateEnabled && reserve.borrowingEnabled
            ? Number(reserve.stableBorrowAPY)
            : -1,
        variableBorrowRate: reserve.borrowingEnabled ? Number(reserve.variableBorrowAPY) : -1,
        iconSymbol: reserve.iconSymbol,
        ...(reserve.isWrappedBaseAsset
          ? fetchIconSymbolAndName({
              symbol: baseAssetSymbol,
              underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
            })
          : {}),
      };
    });

  const {
    loading: poolsLoading,
    error,
    data,
  } = useQuery<{ pools: AtomicaSubgraphPool[]; markets: AtomicaSubgraphMarket[] }>(MAIN_QUERY, {
    variables: {
      author: '0x7069c89493E8636cD7D9B83ae214Ca3dbb84103A'.toLowerCase(),
    },
  });

  const fetchBorrowAllowance = useCallback(
    async (poolId: string, forceApprovalCheck?: boolean) => {
      // Check approved amount on-chain on first load or if an action triggers a re-check such as an approval being confirmed
      if (approvedCredit[poolId] === undefined || forceApprovalCheck) {
        const pool = data?.pools.find((pool) => pool.id.toLowerCase() === poolId.toLowerCase());

        if (!pool) {
          return;
        }
        const poolReserve = reserves.find((reserve) => {
          if (pool.capitalTokenSymbol.toLowerCase() === 'eth') return reserve.isWrappedBaseAsset;
          return pool.capitalTokenSymbol.toLowerCase() === reserve.symbol.toLowerCase();
        }) as ComputedReserveData;

        const vault = vaults?.find(
          (vault) => vault.atomicaPool.toLowerCase() === poolId.toLowerCase()
        );

        if (poolReserve && vault) {
          const { amount } = await getCreditDelegationApprovedAmount({
            delegatee: vault.vault,
            debtTokenAddress: poolReserve.stableDebtTokenAddress,
          });

          setApprovedCredit((prev) => {
            const amountUsdBig = valueToBigNumber(amount ?? '0')
              .multipliedBy(poolReserve.formattedPriceInMarketReferenceCurrency)
              .multipliedBy(marketReferencePriceInUsd)
              .shiftedBy(-USD_DECIMALS);

            return {
              ...prev,
              [poolId.toLowerCase()]: {
                amount,
                amountUsdBig,
                amountUsd: amountUsdBig.toFixed(2),
              },
            };
          });
        }
      }
    },
    [
      approvedCredit,
      data?.pools,
      vaults,
      reserves,
      getCreditDelegationApprovedAmount,
      setApprovedCredit,
    ]
  );

  const fetchAllBorrowAllowances = useCallback(
    async (forceApprovalCheck?: boolean) => {
      if (approvedCreditLoading || loadingVaults) {
        return;
      }
      setApprovedCreditLoading(true);

      await Promise.all(
        (data?.pools ?? []).map((pool) => fetchBorrowAllowance(pool.id, forceApprovalCheck))
      );
      setApprovedCreditLoading(false);
    },

    [
      fetchBorrowAllowance,
      setApprovedCreditLoading,
      approvedCreditLoading,
      loadingVaults,
      data?.pools,
    ]
  );

  useEffect(() => {
    if (!appDataLoading && !poolsLoading && !approvedCreditLoaded && !loadingVaults) {
      fetchAllBorrowAllowances();
      setApprovedCreditLoaded(true);
    }
  }, [fetchAllBorrowAllowances, appDataLoading, poolsLoading, approvedCreditLoaded, loadingVaults]);

  const pools: AtomicaDelegationPool[] = useMemo(() => {
    if (poolsLoading || appDataLoading || approvedCreditLoading || loadingVaults) {
      return [];
    }

    return (data?.pools ?? []).map((pool: AtomicaSubgraphPool) => {
      const userReserve = reserves.find((reserve) => reserve.symbol === pool.capitalTokenSymbol);

      console.log({
        userReserve,
        reserves,
        pool,
      });

      const tokenToBorrow = tokensToBorrow.find(
        (token) => token.symbol === pool.capitalTokenSymbol
      );

      const poolMetadata = metadata?.find(
        (data) => data.EntityId.toLowerCase() === pool.id.toLowerCase()
      );

      const vault = vaults?.find(
        (vault) => vault.atomicaPool.toLowerCase() === pool.id.toLowerCase()
      );

      return {
        id: pool.id,
        symbol: pool.capitalTokenSymbol,
        iconSymbol: pool.capitalTokenSymbol,
        name: pool.name,
        manager: pool.manager,
        markets: pool.markets,
        walletBalance:
          (userReserve?.underlyingAsset && walletBalances[userReserve?.underlyingAsset]?.amount) ??
          '0.0',
        walletBalanceUSD:
          (userReserve?.underlyingAsset &&
            walletBalances[userReserve?.underlyingAsset]?.amountUSD) ??
          '0.0',
        supplyCap: userReserve?.supplyCap ?? '0.0',
        totalLiquidity: userReserve?.totalLiquidity ?? '0.0',
        supplyAPY: '0.0',
        underlyingAsset: userReserve?.underlyingAsset ?? '',
        isActive: true,
        availableBalance: tokenToBorrow?.availableBorrows ?? '0.0',
        availableBalanceUsd: tokenToBorrow?.availableBorrowsInUSD ?? '0.0',
        metadata: poolMetadata,
        approvedCredit: approvedCredit[pool.id.toLowerCase()]?.amount ?? '0.0',
        approvedCreditUsd: approvedCredit[pool.id.toLowerCase()]?.amountUsd ?? '0.0',
        approvedCreditUsdBig:
          approvedCredit[pool.id.toLowerCase()]?.amountUsdBig ?? valueToBigNumber(0),
        vault,
      };
    });
  }, [data?.pools, reserves, tokensToBorrow, metadata, approvedCredit]);

  const tokensInPools = useMemo(
    () =>
      data?.pools?.map((pool) => ({
        address: pool.capitalTokenAddress,
        symbol: pool.capitalTokenSymbol,
        decimals: pool.capitalTokenDecimals,
      })) ?? [],
    [data?.pools]
  );

  const markets: AtomicaBorrowMarket[] = useMemo(() => {
    if (poolsLoading || appDataLoading) {
      return [];
    }

    return (data?.markets ?? []).map((market: AtomicaSubgraphMarket) => {
      const token = tokensInPools?.find((token) => token.address === market.capitalToken);
      const userReserve = reserves.find((reserve) => reserve.symbol === token?.symbol);

      console.log({
        token,
        userReserve,
        reserves,
      });

      return {
        id: market.id,
        symbol: token?.symbol ?? '',
        iconSymbol: token?.symbol ?? '',
        title: market.title,
        walletBalance: token ? walletBalances[token.address]?.amount ?? '0.0' : '0.0',
        walletBalanceUSD: token ? walletBalances[token.address]?.amountUSD ?? '0.0' : '0.0',
        totalLiquidity: '0.0',
        underlyingAsset: userReserve?.underlyingAsset ?? '',
        isActive: true,
        detailsAddress: '',
        totalBorrows: '0.0',
        availableBorrows: token ? normalize(market.desiredCover, token.decimals) : '0.0',
        availableBorrowsInUSD: token ? normalize(market.desiredCover, token.decimals) : '0.0',
        stableBorrowRate: '0.0',
        variableBorrowRate: '0.0',
        borrowCap: token ? normalize(market.desiredCover, token.decimals) : '0.0',
      };
    });
  }, [data?.markets, tokensInPools, walletBalances, reserves]);

  console.log({
    pools,
    markets,
  });

  return {
    pools,
    markets,
    error,
    loading: poolsLoading || appDataLoading || approvedCreditLoading || loadingVaults,
    fetchBorrowAllowance,
    fetchAllBorrowAllowances,
    refetchVaults,
  };
};
