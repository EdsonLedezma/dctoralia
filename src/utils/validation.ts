// Validation error types
export interface ValidationError {
  code: string
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Password validation requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
} as const

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = []
  
  if (!email) {
    errors.push({
      code: "EMAIL_REQUIRED",
      field: "email",
      message: "El email es requerido"
    })
    return { isValid: false, errors }
  }

  if (email.length > 254) {
    errors.push({
      code: "EMAIL_TOO_LONG",
      field: "email", 
      message: "El email es demasiado largo"
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.push({
      code: "EMAIL_INVALID_FORMAT",
      field: "email",
      message: "Formato de email inválido"
    })
  }

  // Check for common invalid patterns
  if (email.includes('..')) {
    errors.push({
      code: "EMAIL_CONSECUTIVE_DOTS",
      field: "email",
      message: "El email no puede contener puntos consecutivos"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = []

  if (!password) {
    errors.push({
      code: "PASSWORD_REQUIRED",
      field: "password",
      message: "La contraseña es requerida"
    })
    return { isValid: false, errors }
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push({
      code: "PASSWORD_TOO_SHORT",
      field: "password",
      message: `La contraseña debe tener al menos ${PASSWORD_REQUIREMENTS.minLength} caracteres`
    })
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push({
      code: "PASSWORD_TOO_LONG",
      field: "password",
      message: `La contraseña no puede tener más de ${PASSWORD_REQUIREMENTS.maxLength} caracteres`
    })
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      code: "PASSWORD_MISSING_UPPERCASE",
      field: "password",
      message: "La contraseña debe contener al menos una letra mayúscula"
    })
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      code: "PASSWORD_MISSING_LOWERCASE", 
      field: "password",
      message: "La contraseña debe contener al menos una letra minúscula"
    })
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push({
      code: "PASSWORD_MISSING_NUMBER",
      field: "password",
      message: "La contraseña debe contener al menos un número"
    })
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push({
      code: "PASSWORD_MISSING_SPECIAL_CHAR",
      field: "password",
      message: "La contraseña debe contener al menos un carácter especial (!@#$%^&*)"
    })
  }

  // Check for common weak patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push({
      code: "PASSWORD_REPEATED_CHARS",
      field: "password",
      message: "La contraseña no debe contener caracteres repetidos consecutivos"
    })
  }

  const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty']
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push({
      code: "PASSWORD_TOO_COMMON",
      field: "password",
      message: "Esta contraseña es demasiado común"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// Name validation
export const validateName = (name: string): ValidationResult => {
  const errors: ValidationError[] = []

  if (!name) {
    errors.push({
      code: "NAME_REQUIRED",
      field: "name",
      message: "El nombre es requerido"
    })
    return { isValid: false, errors }
  }

  if (name.length < 2) {
    errors.push({
      code: "NAME_TOO_SHORT",
      field: "name",
      message: "El nombre debe tener al menos 2 caracteres"
    })
  }

  if (name.length > 100) {
    errors.push({
      code: "NAME_TOO_LONG",
      field: "name",
      message: "El nombre no puede tener más de 100 caracteres"
    })
  }

  if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(name)) {
    errors.push({
      code: "NAME_INVALID_CHARS",
      field: "name",
      message: "El nombre solo puede contener letras y espacios"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// Phone validation
export const validatePhone = (phone: string): ValidationResult => {
  const errors: ValidationError[] = []

  if (!phone) {
    errors.push({
      code: "PHONE_REQUIRED",
      field: "phone",
      message: "El teléfono es requerido"
    })
    return { isValid: false, errors }
  }

  // Remove common formatting characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (!/^\+?[\d]+$/.test(cleanPhone)) {
    errors.push({
      code: "PHONE_INVALID_FORMAT",
      field: "phone",
      message: "El teléfono solo puede contener números, espacios, guiones y paréntesis"
    })
  }

  if (cleanPhone.length < 10) {
    errors.push({
      code: "PHONE_TOO_SHORT",
      field: "phone",
      message: "El teléfono debe tener al menos 10 dígitos"
    })
  }

  if (cleanPhone.length > 15) {
    errors.push({
      code: "PHONE_TOO_LONG",
      field: "phone",
      message: "El teléfono no puede tener más de 15 dígitos"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// License validation for doctors
export const validateLicense = (license: string): ValidationResult => {
  const errors: ValidationError[] = []

  if (!license) {
    errors.push({
      code: "LICENSE_REQUIRED",
      field: "license",
      message: "El número de cédula es requerido"
    })
    return { isValid: false, errors }
  }

  if (!/^\d+$/.test(license)) {
    errors.push({
      code: "LICENSE_INVALID_FORMAT",
      field: "license",
      message: "El número de cédula solo puede contener números"
    })
  }

  if (license.length < 5) {
    errors.push({
      code: "LICENSE_TOO_SHORT",
      field: "license",
      message: "El número de cédula debe tener al menos 5 dígitos"
    })
  }

  if (license.length > 20) {
    errors.push({
      code: "LICENSE_TOO_LONG",
      field: "license",
      message: "El número de cédula no puede tener más de 20 dígitos"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// Specialty validation
export const validateSpecialty = (specialty: string): ValidationResult => {
  const errors: ValidationError[] = []

  if (!specialty) {
    errors.push({
      code: "SPECIALTY_REQUIRED",
      field: "specialty",
      message: "La especialidad es requerida"
    })
  }

  return { isValid: errors.length === 0, errors }
}

// Login validation
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: ValidationError[] = []

  const emailValidation = validateEmail(email)
  const passwordValidation = validatePassword(password)

  errors.push(...emailValidation.errors)
  errors.push(...passwordValidation.errors)

  return { isValid: errors.length === 0, errors }
}

// Registration validation
export const validateRegistrationForm = (data: {
  name: string
  email: string
  password: string
  phone: string
  role: string
  specialty?: string
  license?: string
}): ValidationResult => {
  const errors: ValidationError[] = []

  const nameValidation = validateName(data.name)
  const emailValidation = validateEmail(data.email)
  const passwordValidation = validatePassword(data.password)
  const phoneValidation = validatePhone(data.phone)

  errors.push(...nameValidation.errors)
  errors.push(...emailValidation.errors)
  errors.push(...passwordValidation.errors)
  errors.push(...phoneValidation.errors)

  // Doctor-specific validations
  if (data.role === 'DOCTOR') {
    if (data.specialty) {
      const specialtyValidation = validateSpecialty(data.specialty)
      errors.push(...specialtyValidation.errors)
    }

    if (data.license) {
      const licenseValidation = validateLicense(data.license)
      errors.push(...licenseValidation.errors)
    }
  }

  return { isValid: errors.length === 0, errors }
}

// Helper function to get password strength
export const getPasswordStrength = (password: string): {
  score: number
  feedback: string[]
} => {
  let score = 0
  const feedback: string[] = []

  if (password.length >= 8) score += 1
  else feedback.push("Usa al menos 8 caracteres")

  if (/[a-z]/.test(password)) score += 1
  else feedback.push("Incluye letras minúsculas")

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push("Incluye letras mayúsculas")

  if (/\d/.test(password)) score += 1
  else feedback.push("Incluye números")

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1
  else feedback.push("Incluye caracteres especiales")

  if (password.length >= 12) score += 1

  return { score, feedback }
} 