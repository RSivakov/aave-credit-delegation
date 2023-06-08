import { Trans } from '@lingui/macro';
import { Typography } from '@mui/material';
import { Dispatch, SetStateAction, useState } from 'react';
import { ListColumn } from 'src/components/lists/ListColumn';
import { ListHeaderTitle } from 'src/components/lists/ListHeaderTitle';
import { ListHeaderWrapper } from 'src/components/lists/ListHeaderWrapper';
import { ListWrapper } from 'src/components/lists/ListWrapper';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { CREDIT_DELEGATION_LIST_COLUMN_WIDTHS } from 'src/utils/creditDelegationSortUtils';

import { CreditDelegationContentNoData } from '../../CreditDelegationContentNoData';
import { AtomicaLoan } from '../../types';
import { ListButtonsColumn } from '../ListButtonsColumn';
import { ListLoader } from '../ListLoader';
import { BorrowedPositionsListItem } from './BorrowedPositionsListItem';

const head = [
  {
    title: <Trans>Asset</Trans>,
    sortKey: 'symbol',
  },
  {
    title: <Trans>Name</Trans>,
    sortKey: 'market.title',
  },
  {
    title: <Trans>Amount</Trans>,
    sortKey: 'principal',
  },
  {
    title: <Trans>Repaid</Trans>,
    sortKey: 'repaidPrincpipal',
  },
  {
    title: <Trans>Status</Trans>,
    sortKey: 'status',
  },
];

interface HeaderProps {
  sortName: string;
  sortDesc: boolean;
  setSortName: Dispatch<SetStateAction<string>>;
  setSortDesc: Dispatch<SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({
  sortName,
  sortDesc,
  setSortName,
  setSortDesc,
}: HeaderProps) => {
  return (
    <ListHeaderWrapper>
      {head.map((col) => (
        <ListColumn
          isRow={col.sortKey === 'symbol'}
          maxWidth={
            col.sortKey === 'symbol' ? CREDIT_DELEGATION_LIST_COLUMN_WIDTHS.ASSET : undefined
          }
          key={col.sortKey}
        >
          <ListHeaderTitle
            sortName={sortName}
            sortDesc={sortDesc}
            setSortName={setSortName}
            setSortDesc={setSortDesc}
            sortKey={col.sortKey}
          >
            {col.title}
          </ListHeaderTitle>
        </ListColumn>
      ))}
      <ListButtonsColumn isColumnHeader />
    </ListHeaderWrapper>
  );
};

export const BorrowedPositionsList = () => {
  const { loading } = useAppDataContext();
  const [sortName, setSortName] = useState('');
  const [sortDesc, setSortDesc] = useState(false);

  const sortedReserves: AtomicaLoan[] = [
    {
      id: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      iconSymbol: 'DAI',
      market: {
        id: '0x6b175474e89094c44da98b954eedeac495271d0f',
        title: 'Polygon Mumbai',
      },
      principal: '10000',
      interest: '1000',
      repaidPrincipal: '10',
      repaidInterest: '1',
      status: 'pending',
    },
  ];

  if (loading)
    return <ListLoader title={<Trans>Your loans</Trans>} head={head.map((c) => c.title)} />;

  return (
    <ListWrapper
      titleComponent={
        <Typography component="div" variant="h3" sx={{ mr: 4 }}>
          <Trans>Your loans</Trans>
        </Typography>
      }
      localStorageName="borrowedAssetsCreditDelegationTableCollapse"
      noData={!sortedReserves.length}
    >
      {!sortedReserves.length && (
        <CreditDelegationContentNoData text={<Trans>Nothing borrowed yet</Trans>} />
      )}

      {!!sortedReserves.length && (
        <Header
          setSortDesc={setSortDesc}
          setSortName={setSortName}
          sortDesc={sortDesc}
          sortName={sortName}
        />
      )}
      {sortedReserves.map((item) => (
        <BorrowedPositionsListItem key={item.id} {...item} />
      ))}
    </ListWrapper>
  );
};
