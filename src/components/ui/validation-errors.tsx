import React from "react";
import { Alert, AlertDescription } from "./alert";
import { Badge } from "./badge";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ValidationError } from "../../utils/validation";

interface ValidationErrorsProps {
  errors: ValidationError[];
  className?: string;
}

export function ValidationErrors({
  errors,
  className = "",
}: ValidationErrorsProps) {
  if (errors.length === 0) return null;

  const groupedErrors = errors.reduce(
    (acc, error) => {
      acc[error.field] ??= [];
      acc[error.field]!.push(error);
      return acc;
    },
    {} as Record<string, ValidationError[]>,
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {Object.entries(groupedErrors).map(([field, fieldErrors]) => (
        <Alert key={field} variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium capitalize">{field}:</div>
              {fieldErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{error.message}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {error.code}
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  className = "",
}: PasswordStrengthIndicatorProps) {
  const requirements = [
    {
      test: (p: string) => p.length >= 8,
      label: "Al menos 8 caracteres",
      code: "MIN_LENGTH",
    },
    {
      test: (p: string) => /[a-z]/.test(p),
      label: "Letra minúscula",
      code: "LOWERCASE",
    },
    {
      test: (p: string) => /[A-Z]/.test(p),
      label: "Letra mayúscula",
      code: "UPPERCASE",
    },
    { test: (p: string) => /\d/.test(p), label: "Un número", code: "NUMBER" },
    {
      test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
      label: "Carácter especial",
      code: "SPECIAL_CHAR",
    },
  ];

  const metRequirements = requirements.filter((req) => req.test(password));
  const strengthScore = metRequirements.length;

  const getStrengthText = (score: number) => {
    if (score <= 1) return "Muy débil";
    if (score <= 2) return "Débil";
    if (score <= 3) return "Regular";
    if (score <= 4) return "Fuerte";
    return "Muy fuerte";
  };

  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Fuerza de contraseña</span>
          <span className="font-medium">{getStrengthText(strengthScore)}</span>
        </div>
        <div className="bg-muted h-2 w-full rounded-full">
          <div
            className={`bg-foreground h-2 rounded-full transition-all duration-300`}
            style={{ width: `${(strengthScore / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <div className="text-foreground text-xs font-medium">Requisitos:</div>
        <div className="grid grid-cols-1 gap-1 text-xs">
          {requirements.map((req, index) => {
            const isMet = req.test(password);
            return (
              <div key={index} className="flex items-center space-x-2">
                {isMet ? (
                  <CheckCircle2 className="text-foreground h-3 w-3" />
                ) : (
                  <X className="text-muted-foreground h-3 w-3" />
                )}
                <span
                  className={
                    isMet ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {req.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FieldValidationProps {
  field: string;
  errors: ValidationError[];
  children: React.ReactNode;
}

export function FieldValidation({
  field,
  errors,
  children,
}: FieldValidationProps) {
  const fieldErrors = errors.filter((error) => error.field === field);
  const hasErrors = fieldErrors.length > 0;

  return (
    <div className="space-y-1">
      <div className={hasErrors ? "has-error" : ""}>{children}</div>
      {hasErrors && (
        <div className="space-y-1">
          {fieldErrors.map((error, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded bg-red-50 p-1 text-xs text-red-600"
            >
              <span>{error.message}</span>
              <Badge variant="outline" className="h-4 text-xs">
                {error.code}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
