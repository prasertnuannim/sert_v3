import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInputProps = {
  name: string;
  type: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
};

const FormInput = ({
  name,
  type,
  label,
  defaultValue,
  placeholder,
  error,
}: FormInputProps) => {
  return (
    <div className="mb-2">
      {label && (
        <Label htmlFor={name} className="p-1">
          {label}
        </Label>
      )}
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      {error && (
        <p className="text-red-500 text-sm">{error}</p> 
      )}
    </div>
  );
};

export default FormInput;
