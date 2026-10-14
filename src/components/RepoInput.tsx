import { useState, type FormEvent } from "react";
import { Button, FormControl, FormErrorMessage, HStack, Input } from "@chakra-ui/react";
import { parseInput } from "../lib/parseInput";

interface Props {
  onSubmit: (value: string) => void;
  defaultValue?: string;
  buttonLabel: string;
  /** Label aksesibel untuk input. */
  label: string;
  placeholder?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}

export function RepoInput({
  onSubmit,
  defaultValue = "",
  buttonLabel,
  label,
  placeholder = "owner/repo, URL GitHub, atau nama package npm",
  size = "md",
  autoFocus,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parseInput(value).kind === "invalid") {
      setInvalid(true);
      return;
    }
    onSubmit(value.trim());
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormControl isInvalid={invalid}>
        <HStack align="start">
          <Input
            size={size}
            value={value}
            placeholder={placeholder}
            aria-label={label}
            autoFocus={autoFocus}
            spellCheck={false}
            autoCapitalize="off"
            onChange={(e) => {
              setValue(e.target.value);
              setInvalid(false);
            }}
          />
          <Button type="submit" size={size} colorScheme="blue" flexShrink={0}>
            {buttonLabel}
          </Button>
        </HStack>
        <FormErrorMessage>Contoh: pmndrs/zustand, https://github.com/vercel/swr, atau zustand</FormErrorMessage>
      </FormControl>
    </form>
  );
}
