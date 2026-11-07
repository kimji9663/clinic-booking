import { brandIds, brands, isBrandId } from '@clinic/theme';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useBrand } from './BrandProvider';

/** 데모용 고객사 전환 셀렉트. 실제 서비스에서는 로그인한 병원 계정으로 결정된다. */
export function BrandSwitcher() {
  const { brandId, setBrandId } = useBrand();

  return (
    <TextField
      select
      size="small"
      label="고객사"
      value={brandId}
      onChange={(event) => {
        if (isBrandId(event.target.value)) setBrandId(event.target.value);
      }}
      sx={{ minWidth: { xs: 128, sm: 180 } }}
    >
      {brandIds.map((id) => (
        <MenuItem key={id} value={id}>
          {brands[id].shortName}
        </MenuItem>
      ))}
    </TextField>
  );
}
