import { Trans } from '@lingui/macro';
import { Button } from '@mui/material';
import { ListColumn } from 'src/components/lists/ListColumn';
import { Link } from 'src/components/primitives/Link';
import { Row } from 'src/components/primitives/Row';
import { useModalContext } from 'src/hooks/useModal';

import { useManagerDetails } from '../../hooks/useManagerDetails';
import { AtomicaDelegationPool } from '../../types';
import { ListAPRColumn } from '../ListAPRColumn';
import { ListButtonsColumn } from '../ListButtonsColumn';
import { ListItemWrapper } from '../ListItemWrapper';
import { ListValueColumn } from '../ListValueColumn';

export const SupplyAssetsListItem = ({
  symbol,
  iconSymbol,
  name,
  supplyAPY,
  isActive,
  underlyingAsset,
  availableBalance,
  metadata,
  approvedCredit,
  approvedCreditUsd,
  id,
  manager,
  markets,
}: AtomicaDelegationPool) => {
  const { openCreditDelegation } = useModalContext();

  const { managerDetails } = useManagerDetails(manager);

  return (
    <ListItemWrapper symbol={symbol} iconSymbol={iconSymbol} name={name}>
      <ListColumn>{metadata?.Label}</ListColumn>
      <ListColumn>
        <Link
          href={managerDetails?.website ?? ''}
          sx={{
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            textDecoration: 'underline',
          }}
        >
          {managerDetails?.logo && (
            <img
              src={managerDetails?.logo}
              alt={managerDetails?.title}
              style={{ width: 20, height: 20, marginRight: 2 }}
            />
          )}
          {managerDetails?.title}
        </Link>
      </ListColumn>
      <ListColumn sx={{ fontSize: 10 }}>
        {markets?.map((market) => (
          <Row key={market.id}>
            {market.product.title}: {market.title}
          </Row>
        ))}
      </ListColumn>

      <ListValueColumn
        symbol={symbol}
        value={Number(approvedCredit)}
        subValue={approvedCreditUsd}
        withTooltip
        disabled={Number(approvedCredit) === 0}
      />

      <ListAPRColumn value={Number(supplyAPY)} incentives={[]} symbol={symbol} />

      <ListButtonsColumn>
        <Button
          disabled={!isActive || Number(availableBalance) <= 0}
          variant="contained"
          onClick={() => openCreditDelegation(id, underlyingAsset)}
        >
          <Trans>{Number(approvedCredit) === 0 ? 'Delegate' : 'Manage'}</Trans>
        </Button>
      </ListButtonsColumn>
    </ListItemWrapper>
  );
};
