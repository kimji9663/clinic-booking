import Typography from '@mui/material/Typography';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Combobox } from './Combobox';

const meta: Meta = {
  title: 'Inputs/Combobox',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'WAI-ARIA Combobox(List Autocomplete) 패턴. 포커스는 입력창에 두고 ↑/↓ 로 고르면 aria-activedescendant 로 현재 옵션을 알린다. Enter 선택, Esc 닫기.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

interface Patient {
  id: string;
  name: string;
  phone: string;
}

const patients: Patient[] = [
  { id: '1', name: '김*준', phone: '010-****-4410' },
  { id: '2', name: '김*아', phone: '010-****-1932' },
  { id: '3', name: '김*우', phone: '010-****-0384' },
  { id: '4', name: '박*아', phone: '010-****-2275' },
  { id: '5', name: '이*준', phone: '010-****-9021' },
];

function Demo({ delay }: { delay: number }) {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  // 서버 검색 흉내
  useEffect(() => {
    if (!value) return;
    setLoading(true);
    const timer = setTimeout(() => {
      setOptions(patients.filter((p) => p.name.startsWith(value[0] ?? '')));
      setLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div style={{ maxWidth: 360 }}>
      <Combobox
        label="환자 이름"
        inputValue={value}
        onInputChange={setValue}
        options={value ? options : []}
        loading={loading}
        getOptionKey={(p) => p.id}
        renderOption={(p) => (
          <>
            <strong>{p.name}</strong> <span>{p.phone}</span>
          </>
        )}
        onSelect={(p) => {
          setValue(p.name);
          setSelected(p);
        }}
        helperText="'김' 또는 '박'을 입력해 보세요"
        fullWidth
      />
      <Typography sx={{ mt: 2 }} color="text.secondary">
        선택: {selected ? `${selected.name} (${selected.phone})` : '없음'}
      </Typography>
    </div>
  );
}

export const PatientSearch: Story = {
  render: () => <Demo delay={300} />,
};
