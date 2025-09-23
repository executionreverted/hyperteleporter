"use client";
import { useState, type FormEvent } from "react";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { cn } from "../../../lib/utils";

export interface CreateDriveValues {
  name: string;
  description: string;
}

export function CreateDriveForm({
  initialValues,
  onSubmit,
  submitLabel = "Create Drive",
}: {
  initialValues?: Partial<CreateDriveValues>;
  onSubmit: (values: CreateDriveValues) => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validateField = (field: 'name' | 'description', value: string) => {
    const trimmed = value.trim();
    const maxLength = field === 'name' ? 16 : 64;
    const fieldName = field === 'name' ? 'Name' : 'Description';
    
    if (trimmed.length === 0) {
      return `${fieldName} is required`;
    }
    if (trimmed.length > maxLength) {
      return `${fieldName} must be no more than ${maxLength} characters`;
    }
    return '';
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const nameError = validateField('name', name);
    const descriptionError = validateField('description', description);
    
    setErrors({ name: nameError, description: descriptionError });
    
    if (nameError || descriptionError) return;
    
    setSubmitting(true);
    onSubmit({ name: name.trim(), description: description.trim() });
    setSubmitting(false);
  };

  return (
    <form className="my-2" onSubmit={handleSubmit}>
      <LabelInputContainer className="mb-4">
        <Label htmlFor="drive-name">Drive Name (max 16 characters)</Label>
        <Input
          id="drive-name"
          placeholder="e.g. Project Alpha"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors(prev => ({ ...prev, name: validateField('name', e.target.value) }));
            }
          }}
          required
          maxLength={16}
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </LabelInputContainer>

      <LabelInputContainer className="mb-6">
        <Label htmlFor="drive-description">Description (max 64 characters)</Label>
        <Input
          id="drive-description"
          placeholder="A short description"
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) {
              setErrors(prev => ({ ...prev, description: validateField('description', e.target.value) }));
            }
          }}
          maxLength={64}
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </LabelInputContainer>

      <button
        className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
        type="submit"
        disabled={submitting || !name.trim() || name.trim().length > 16 || (description.trim().length > 0 && description.trim().length > 64)}
      >
        {submitLabel}
      </button>
    </form>
  );
}

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
