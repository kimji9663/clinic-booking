import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

export type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'defaultValue' | 'error'
> & {
  control: Control<T>;
  name: Path<T>;
  /** 입력값을 저장하기 전에 가공 (예: 전화번호 하이픈) */
  transform?: (value: string) => string;
};

/**
 * react-hook-form 과 MUI TextField 를 연결.
 * 오류 메시지는 helperText 로 표시되고 MUI 가 aria-invalid / aria-describedby 를 연결한다.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  transform,
  helperText,
  ...props
}: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, ...field }, fieldState }) => (
        <TextField
          {...props}
          {...field}
          inputRef={ref}
          value={value ?? ''}
          onChange={(event) =>
            onChange(transform ? transform(event.target.value) : event.target.value)
          }
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
        />
      )}
    />
  );
}
