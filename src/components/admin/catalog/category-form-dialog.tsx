"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormFailure } from "@/hooks/use-form-failure";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { AdminCategory } from "@/shared/api/catalog";
import {
  categoryInputSchema,
  type CategoryFormInput,
  type CategoryInput,
} from "@/shared/validation/catalog";

// UC15, steps 3 to 6 and FA01 (docs/catalogo/servicos-do-painel.md): the
// window of a new or edited category, with its name and description. It does
// not close while the request runs (RNF005), and a failure shows at its top
// with the focus (RNF003). After a version conflict (RNF011) the list is read
// again, and the data of the category replace what was typed.

const CATEGORIES_PATH = "/api/admin/categories";

type CategoryFormDialogProps = {
  // The button that opens the window, as the `render` of the trigger.
  trigger: ReactElement;
  // The category being edited; none for a new one.
  category?: AdminCategory;
  onSaved: () => void;
  // The category changed after it was read: the list must be read again.
  onConflict?: () => void;
};

export function CategoryFormDialog({
  trigger,
  category,
  onSaved,
  onConflict,
}: CategoryFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const name = category?.name ?? "";
  const description = category?.description ?? "";
  const { control, handleSubmit, setError, reset } = useForm({
    resolver: zodResolver(categoryInputSchema),
    mode: "onTouched",
    defaultValues: { name, description } satisfies CategoryFormInput,
  });
  const { failure, showFailure, clearFailure } = useFormFailure(setError);

  // The category read again replaces what was typed; the same data keep it.
  useEffect(() => {
    reset({ name, description });
  }, [name, description, category?.updatedAt, reset]);

  function changeOpen(open: boolean) {
    if (isSubmitting) return;
    setIsOpen(open);
    if (!open) {
      // The window opens again with the data of the category, not with what
      // was typed and discarded.
      reset();
      clearFailure();
    }
  }

  async function submit(values: CategoryInput) {
    clearFailure();
    setIsSubmitting(true);
    try {
      await apiRequest(
        category ? `${CATEGORIES_PATH}/${category.id}` : CATEGORIES_PATH,
        {
          method: category ? "PATCH" : "POST",
          body: category
            ? { ...values, updatedAt: category.updatedAt }
            : values,
        },
      );
      setIsOpen(false);
      onSaved();
    } catch (error) {
      showFailure(error);
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        onConflict?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>
        {failure && (
          <FormAlert key={failure.key}>{failure.error.message}</FormAlert>
        )}
        <form
          noValidate
          onSubmit={handleSubmit(submit, clearFailure)}
          className="flex flex-col gap-5"
        >
          <FormField
            control={control}
            name="name"
            label="Nome"
            renderInput={(field) => (
              <Input {...field} placeholder="Ex.: Lavagem" autoComplete="off" />
            )}
          />
          <FormField
            control={control}
            name="description"
            label="Descrição"
            renderInput={(field) => (
              <Textarea {...field} placeholder="Descrição da categoria" />
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              focusableWhenDisabled
              onClick={() => changeOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton isLoading={isSubmitting} loadingLabel="Salvando…">
              Salvar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
