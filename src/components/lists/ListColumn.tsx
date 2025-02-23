import { Box, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';

interface ListColumnProps {
  children?: ReactNode;
  maxWidth?: number;
  minWidth?: number;
  isRow?: boolean;
  align?: 'left' | 'center' | 'right';
  overFlow?: 'hidden' | 'visible';
  sx?: SxProps<Theme>;
}

export const ListColumn = ({
  isRow,
  children,
  minWidth,
  maxWidth,
  align = 'center',
  overFlow = 'visible',
  sx,
}: ListColumnProps) => {
  return (
    <Box
      sx={{
        ...sx,
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: isRow
          ? 'center'
          : align === 'left'
          ? 'flex-start'
          : align === 'right'
          ? 'flex-end'
          : align,
        justifyContent: isRow ? 'flex-start' : 'flex-end',
        flex: 1,
        minWidth: minWidth || '70px',
        maxWidth,
        overflow: overFlow,
        p: 1,
      }}
    >
      {children}
    </Box>
  );
};
